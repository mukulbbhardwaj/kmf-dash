"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type Role,
  bootstrapAdmin,
  checkCredentials,
  checkPassword,
  createUser,
  deleteUser,
  emailTaken,
  endSession,
  isEmail,
  passwordProblem,
  requireAdmin,
  requireUser,
  setPassword,
  startSession,
} from "@/lib/auth";
import type { FormState } from "./actions";

const field = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = field(fd, "email");
  const password = String(fd.get("password") ?? "");
  const user = (await checkCredentials(email, password)) ?? (await bootstrapAdmin(email, password));
  if (!user) return { error: "Wrong email or password." };
  await startSession(user.id);
  redirect(safeNext(field(fd, "next")));
}

/** The caller reloads the page afterwards so no signed-in screens stay in browser memory. */
export async function logout() {
  await endSession();
}

export async function addUser(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const email = field(fd, "email");
  if (!isEmail(email)) return { error: "Enter a valid email." };
  const problem = passwordProblem(String(fd.get("password") ?? ""));
  if (problem) return { error: problem };
  if (await emailTaken(email)) return { error: "That email already has an account." };

  const role: Role = field(fd, "role") === "admin" ? "admin" : "worker";
  await createUser({ email, role, password: String(fd.get("password")) });
  revalidatePath("/settings");
  return { ok: `Added ${email}. Share the password with them.` };
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
