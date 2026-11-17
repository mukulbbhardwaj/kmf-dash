// Adds a demo herd of 10 cows. Run with: npm run seed
// Refuses to touch a database that already has cows.
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@libsql/client";

// Same database the app uses: Turso when TURSO_DATABASE_URL is set, otherwise the local file.
const DB_PATH = process.env.FARM_DB_PATH ?? path.join(process.cwd(), "data", "farm.db");
const url = process.env.TURSO_DATABASE_URL ?? `file:${DB_PATH}`;
if (url.startsWith("file:")) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
await db.executeMultiple(fs.readFileSync(path.join(process.cwd(), "lib", "schema.sql"), "utf8"));
if (Number((await db.execute("SELECT COUNT(*) AS n FROM cows")).rows[0].n) > 0) {
  console.error(`${url.split("?")[0]} already has cows — not seeding.`);
  process.exit(1);
}

// Collect every insert and send them as one transaction.
const stmts = [];
const prepare = (sql) => ({ run: (...args) => stmts.push({ sql, args }) });

const pad = (n) => String(n).padStart(2, "0");
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const cows = [
  ["1042", "Gauri", "HF cross", "Group A", "milking", -5 * 365],
  ["1017", "Lakshmi", "Sahiwal", "Group A", "milking", -6 * 365],
  ["1008", "Kamdhenu", "Gir", "Group A", "milking", -4 * 365],
  ["1023", "Nandini", "Jersey", "Group B", "milking", -3 * 365],
  ["1036", "Surbhi", "Sahiwal", "Group B", "milking", -4 * 365],
  ["1051", "Bela", "Gir", "Group B", "milking", -5 * 365],
  ["1031", "Ganga", "HF cross", "Dry", "dry", -7 * 365],
  ["1049", "Radha", "Jersey", "Heifers", "heifer", -600],
  ["1055", "Kapila", "Gir", "Group B", "milking", -6 * 365],
  ["1060", "Chandni", "Jersey", "Heifers", "heifer", -500],
];
const ids = {};
for (const [tag, name, breed, group, stage, born] of cows) {
  const res = await db.execute({
    sql: "INSERT INTO cows (tag, name, breed, group_name, stage, birth_date) VALUES (?, ?, ?, ?, ?, ?)",
    args: [tag, name, breed, group, stage, day(born)],
  });
  ids[tag] = Number(res.lastInsertRowid);
}

const health = prepare("INSERT INTO health_checks (cow_id, date, time, condition, temperature, symptoms, note) VALUES (?, ?, ?, ?, ?, ?, ?)");
health.run(ids["1042"], day(-8), "07:30", "healthy", 38.6, "[]", "Routine check.");
health.run(ids["1042"], day(-1), "18:10", "watch", 39.1, JSON.stringify(["Less milk", "Not eating"]), null);
health.run(ids["1042"], day(0), "07:10", "sick", 39.6, JSON.stringify(["Swollen udder", "Fever", "Less milk"]), "Vet called. Rear left quarter.");
health.run(ids["1023"], day(-2), "08:00", "watch", 38.9, JSON.stringify(["Limping"]), "Front right hoof.");
for (const tag of ["1017", "1008", "1036", "1051", "1031", "1049", "1055", "1060"]) health.run(ids[tag], day(-6), "07:45", "healthy", 38.5, "[]", null);

const med = prepare(
  "INSERT INTO treatments (cow_id, start_date, medicine, dose, unit, route, times_per_day, days, withdrawal_days, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
);
med.run(ids["1042"], day(0), "Ceftiofur", 10, "ml", "Udder", 2, 3, 4, "Prescribed by vet.");
med.run(ids["1017"], day(-3), "Oxytetracycline", 20, "ml", "Injection", 1, 2, 7, null);
for (const tag of ["1042", "1017", "1008"]) med.run(ids[tag], day(-15), "Albendazole", 15, "ml", "Oral", 1, 1, 0, "Group A deworming.");

const feed = prepare("INSERT INTO feed_logs (date, session, group_name, cow_id, head_count, items) VALUES (?, ?, ?, NULL, ?, ?)");
const ration = (n) =>
  JSON.stringify([
    { name: "Green fodder", qty: 10 * n, unit: "kg" },
    { name: "Dry straw", qty: 2.5 * n, unit: "kg" },
    { name: "Concentrate", qty: 1.5 * n, unit: "kg" },
    { name: "Mineral mix", qty: Math.round(0.05 * n * 1000) / 1000, unit: "kg" },
  ]);
for (let d = -3; d <= 0; d++) {
  for (const [group, n] of [["Group A", 3], ["Group B", 4]]) {
    feed.run(day(d), "morning", group, n, ration(n));
    if (d < 0) feed.run(day(d), "evening", group, n, ration(n));
  }
}

await db.batch(stmts, "write");
console.log(`Seeded ${cows.length} cows into ${url.split("?")[0]}`);
