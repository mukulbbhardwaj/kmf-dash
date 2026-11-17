"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type Role,
  checkCredentials,
  checkPassword,
  countUsers,
  createUser,
  deleteUser,
  endSession,
  passwordProblem,
  requireAdmin,
  requireUser,
  setPassword,
  startSession,
  usernameTaken,
} from "@/lib/auth";
import type { FormState } from "./actions";

const field = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/i;

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const user = await checkCredentials(field(fd, "username"), String(fd.get("password") ?? ""));
  if (!user) return { error: "Wrong username or password." };
  await startSession(user.id);
  redirect(safeNext(field(fd, "next")));
}

/** The caller reloads the page afterwards so no signed-in screens stay in browser memory. */
export async function logout() {
  await endSession();
}

/** Creates the first (admin) account. Only works while there are no users. */
export async function setup(_: FormState, fd: FormData): Promise<FormState> {
  if ((await countUsers()) > 0) redirect("/login");

  const required = process.env.SETUP_CODE;
  if (process.env.NODE_ENV === "production" && !required) {
    return { error: "Set the SETUP_CODE environment variable on the server first." };
  }
  if (required && field(fd, "setup_code") !== required) return { error: "Wrong setup code." };

  const problem = validateNewUser(fd);
  if (problem) return { error: problem };

  await createUser({ username: field(fd, "username"), name: field(fd, "name"), role: "admin", password: String(fd.get("password")) });
  const user = await checkCredentials(field(fd, "username"), String(fd.get("password")));
  await startSession(user!.id);
  redirect("/");
}

export async function addUser(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const problem = validateNewUser(fd);
  if (problem) return { error: problem };
  if (await usernameTaken(field(fd, "username"))) return { error: "That username is already taken." };

  const role: Role = field(fd, "role") === "admin" ? "admin" : "worker";
  await createUser({ username: field(fd, "username"), name: field(fd, "name"), role, password: String(fd.get("password")) });
  revalidatePath("/settings");
  return { ok: `Added ${field(fd, "name")}. Share the username and password with them.` };
}

export async function removeUser(fd: FormData) {
  const admin = await requireAdmin();
  const id = Number(fd.get("id"));
  if (id && id !== admin.id) await deleteUser(id);
  revalidatePath("/settings");
}

export async function resetUserPassword(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const password = String(fd.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  await setPassword(Number(fd.get("id")), password);
  return { ok: "Password changed. They'll need to sign in again." };
}

export async function changeOwnPassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!(await checkPassword(user.id, String(fd.get("current") ?? "")))) return { error: "Current password is wrong." };
  const password = String(fd.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) return { error: problem };
  await setPassword(user.id, password);
  await startSession(user.id);
  return { ok: "Password changed." };
}

function validateNewUser(fd: FormData) {
  if (!field(fd, "name")) return "Enter a name.";
  if (!USERNAME_RE.test(field(fd, "username"))) return "Username: 3–30 letters, numbers, dots or dashes.";
  return passwordProblem(String(fd.get("password") ?? ""));
}
