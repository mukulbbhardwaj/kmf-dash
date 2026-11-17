import "server-only";
import fs from "node:fs";
import path from "node:path";
import { type Client, type InArgs, type InStatement, type Row, createClient } from "@libsql/client";

// Local dev: a SQLite file. Hosted (e.g. Vercel): a Turso database via TURSO_DATABASE_URL.
const URL = process.env.TURSO_DATABASE_URL ?? `file:${process.env.FARM_DB_PATH ?? path.join(process.cwd(), "data", "farm.db")}`;
const SCHEMA_PATH = path.join(process.cwd(), "lib", "schema.sql");

const globalForDb = globalThis as unknown as { farmDb?: Client; farmDbReady?: Promise<void> };

function client() {
  if (!globalForDb.farmDb) {
    if (URL.startsWith("file:")) fs.mkdirSync(path.dirname(URL.slice("file:".length)), { recursive: true });
    globalForDb.farmDb = createClient({ url: URL, authToken: process.env.TURSO_AUTH_TOKEN });
  }
  return globalForDb.farmDb;
}

/** The connection, with the schema applied once per server instance. */
export async function db() {
  const c = client();
  globalForDb.farmDbReady ??= (async () => {
    if (URL.startsWith("file:")) await c.execute("PRAGMA journal_mode = WAL");
    await c.executeMultiple(fs.readFileSync(SCHEMA_PATH, "utf8"));
  })().catch((err) => {
    globalForDb.farmDbReady = undefined;
    throw err;
  });
  await globalForDb.farmDbReady;
  return c;
}

export async function all(sql: string, args: InArgs = []): Promise<Row[]> {
  return (await (await db()).execute({ sql, args })).rows;
}

export async function get(sql: string, args: InArgs = []): Promise<Row | undefined> {
  return (await all(sql, args))[0];
}

export async function run(sql: string, args: InArgs = []) {
  const res = await (await db()).execute({ sql, args });
  return { lastInsertRowid: Number(res.lastInsertRowid ?? 0), rowsAffected: res.rowsAffected };
}

/** Several writes that succeed or fail together. */
export async function batch(stmts: InStatement[]) {
  return (await db()).batch(stmts, "write");
}
