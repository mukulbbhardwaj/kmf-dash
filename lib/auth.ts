import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { all, get, run } from "./db";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const SESSION_COOKIE = "farm_session";
const SESSION_DAYS = 30;

export type Role = "admin" | "worker";
export type User = { id: number; email: string; role: Role };

function toUser(r: Record<string, unknown>): User {
  return { id: Number(r.id), email: String(r.email), role: r.role === "admin" ? "admin" : "worker" };
}

// ---------- Passwords ----------

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(actual, expected);
}

export function passwordProblem(password: string) {
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

// A real hash to compare against when the email doesn't exist, so timing doesn't reveal it.
const dummyHash = hashPassword("not-a-real-password");

// ---------- Users ----------

export async function countUsers() {
  return Number((await get("SELECT COUNT(*) AS n FROM users"))?.n ?? 0);
}

export async function listUsers(): Promise<User[]> {
  return (await all("SELECT id, email, role FROM users ORDER BY role, email COLLATE NOCASE")).map(toUser);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createUser(u: { email: string; role: Role; password: string }) {
  const email = normalizeEmail(u.email);
  await run("INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)", [
    email,
    email.split("@")[0],
    u.role,
    await hashPassword(u.password),
  ]);
}

export async function emailTaken(email: string) {
  return !!(await get("SELECT 1 FROM users WHERE email = ? COLLATE NOCASE", [normalizeEmail(email)]));
}

export async function setPassword(userId: number, password: string) {
  await run("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(password), userId]);
  await run("DELETE FROM sessions WHERE user_id = ?", [userId]);
}

export async function deleteUser(userId: number) {
  await run("DELETE FROM sessions WHERE user_id = ?", [userId]);
  await run("DELETE FROM users WHERE id = ?", [userId]);
}

export async function checkCredentials(email: string, password: string): Promise<User | null> {
  const r = await get("SELECT * FROM users WHERE email = ? COLLATE NOCASE", [normalizeEmail(email)]);
  if (!r) {
    await verifyPassword(password, await dummyHash);
    return null;
  }
  return (await verifyPassword(password, String(r.password_hash))) ? toUser(r) : null;
}

export async function checkPassword(userId: number, password: string) {
  const r = await get("SELECT password_hash FROM users WHERE id = ?", [userId]);
  return !!r && verifyPassword(password, String(r.password_hash));
}

/**
 * The first admin comes from the ADMIN_EMAIL / ADMIN_PASSWORD environment variables:
 * while no accounts exist, signing in with exactly those creates the admin account.
 * After that the variables are ignored; change the password in Settings.
 */
export async function bootstrapAdmin(email: string, password: string): Promise<User | null> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword || (await countUsers()) > 0) return null;
  const a = Buffer.from(`${normalizeEmail(email)}\n${password}`);
  const b = Buffer.from(`${normalizeEmail(adminEmail)}\n${adminPassword}`);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  await createUser({ email: adminEmail, role: "admin", password: adminPassword });
  return checkCredentials(adminEmail, adminPassword);
}

// ---------- Sessions ----------
// The cookie holds a random token; the database stores only its SHA-256 hash.

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function startSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await run("DELETE FROM sessions WHERE expires_at < ?", [new Date().toISOString()]);
  await run("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [hashToken(token), userId, expires.toISOString()]);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await run("DELETE FROM sessions WHERE token_hash = ?", [hashToken(token)]);
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user, or null. Deduplicated within one request. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const r = await get(
    `SELECT u.id, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > ?`,
    [hashToken(token), new Date().toISOString()],
  );
  return r ? toUser(r) : null;
});

/** Use at the top of every page body and server action. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/settings");
  return user;
}
