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

// Bump when lib/schema.sql or migrate() changes, so existing databases get upgraded.
const SCHEMA_VERSION = 4;

/** The connection, with the schema checked once per server instance. */
export async function db() {
  const c = client();
  globalForDb.farmDbReady ??= ensureSchema(c).catch((err) => {
    globalForDb.farmDbReady = undefined;
    throw err;
  });
  await globalForDb.farmDbReady;
  return c;
}

// One cheap query when the database is current; the full schema only when it isn't.
// The version lives in a table because Turso doesn't persist PRAGMA user_version.
async function ensureSchema(c: Client) {
  if (URL.startsWith("file:")) await c.execute("PRAGMA journal_mode = WAL");
  if ((await storedSchemaVersion(c)) >= SCHEMA_VERSION) return;
  await c.executeMultiple(fs.readFileSync(SCHEMA_PATH, "utf8"));
  await migrate(c);
  await c.execute({
    sql: "INSERT INTO app_meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    args: [String(SCHEMA_VERSION)],
  });
}

async function storedSchemaVersion(c: Client) {
  try {
    const r = await c.execute("SELECT value FROM app_meta WHERE key = 'schema_version'");
    return Number(r.rows[0]?.value ?? 0);
  } catch {
    return 0; // app_meta doesn't exist yet
  }
}

// Small in-place upgrades for databases created by earlier versions.
async function migrate(c: Client) {
  const userCols = (await c.execute("PRAGMA table_info(users)")).rows.map((r) => String(r.name));
  if (userCols.includes("username")) await c.execute("ALTER TABLE users RENAME COLUMN username TO email");
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
