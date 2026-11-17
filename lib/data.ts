import "server-only";
import { all, batch, get, run } from "./db";
import { addDays, diffDays } from "./dates";

export type Condition = "healthy" | "watch" | "sick";
export type Stage = "milking" | "dry" | "heifer" | "calf";
export type Session = "morning" | "evening";

export type Cow = {
  id: number;
  tag: string;
  name: string | null;
  breed: string | null;
  groupName: string | null;
  stage: Stage;
  birthDate: string | null;
  notes: string | null;
};

export type CowSummary = Cow & {
  condition: Condition | null;
  temperature: number | null;
  lastCheck: string | null;
  onTreatment: boolean;
  milkSafeFrom: string | null; // set only while milk is on hold
};

export type HealthCheck = {
  id: number;
  cowId: number;
  date: string;
  time: string | null;
  condition: Condition;
  temperature: number | null;
  symptoms: string[];
  note: string | null;
};

export type Treatment = {
  id: number;
  cowId: number;
  startDate: string;
  medicine: string;
  dose: number | null;
  unit: string;
  route: string | null;
  timesPerDay: number;
  days: number;
  withdrawalDays: number;
  note: string | null;
  // derived
  endDate: string;
  milkSafeFrom: string;
};

export type TreatmentWithCow = Treatment & { cowTag: string; cowName: string | null };

export type FeedItem = { name: string; qty: number; unit: string };

export type FeedLog = {
  id: number;
  date: string;
  session: Session;
  groupName: string | null;
  cowId: number | null;
  cowTag: string | null;
  headCount: number;
  items: FeedItem[];
  note: string | null;
};

type Row = Record<string, unknown>;
const str = (v: unknown) => (v == null ? null : String(v));
const num = (v: unknown) => (v == null ? null : Number(v));

function toCow(r: Row): Cow {
  return {
    id: Number(r.id),
    tag: String(r.tag),
    name: str(r.name),
    breed: str(r.breed),
    groupName: str(r.group_name),
    stage: String(r.stage) as Stage,
    birthDate: str(r.birth_date),
    notes: str(r.notes),
  };
}

function toHealth(r: Row): HealthCheck {
  return {
    id: Number(r.id),
    cowId: Number(r.cow_id),
    date: String(r.date),
    time: str(r.time),
    condition: String(r.condition) as Condition,
    temperature: num(r.temperature),
    symptoms: JSON.parse(String(r.symptoms ?? "[]")),
    note: str(r.note),
  };
}

function toTreatment(r: Row): Treatment {
  const startDate = String(r.start_date);
  const days = Number(r.days);
  const withdrawalDays = Number(r.withdrawal_days);
  const endDate = addDays(startDate, days - 1);
  return {
    id: Number(r.id),
    cowId: Number(r.cow_id),
    startDate,
    medicine: String(r.medicine),
    dose: num(r.dose),
    unit: String(r.unit),
    route: str(r.route),
    timesPerDay: Number(r.times_per_day),
    days,
    withdrawalDays,
    note: str(r.note),
    endDate,
    milkSafeFrom: addDays(endDate, withdrawalDays),
  };
}

function toFeed(r: Row): FeedLog {
  return {
    id: Number(r.id),
    date: String(r.date),
    session: String(r.session) as Session,
    groupName: str(r.group_name),
    cowId: num(r.cow_id),
    cowTag: str(r.cow_tag),
    headCount: Number(r.head_count),
    items: JSON.parse(String(r.items ?? "[]")),
    note: str(r.note),
  };
}

export function isActiveTreatment(t: Treatment, today: string) {
  return t.startDate <= today && today <= t.endDate;
}

export function isMilkHold(t: Treatment, today: string) {
  return t.withdrawalDays > 0 && t.startDate <= today && today < t.milkSafeFrom;
}

export function treatmentDay(t: Treatment, today: string) {
  return Math.min(t.days, diffDays(today, t.startDate) + 1);
}

// ---------- Cows ----------

export async function listCows(today: string): Promise<CowSummary[]> {
  const [cowRows, latest, recentRows] = await Promise.all([
    all("SELECT * FROM cows ORDER BY tag COLLATE NOCASE"),
    all(
      `SELECT cow_id, condition, temperature, date FROM (
         SELECT *, ROW_NUMBER() OVER (PARTITION BY cow_id ORDER BY date DESC, time DESC, id DESC) rn
         FROM health_checks)
       WHERE rn = 1`,
    ),
    // Anything that could still be active or holding milk today.
    all("SELECT * FROM treatments WHERE start_date <= ? AND start_date >= ?", [today, addDays(today, -400)]),
  ]);
  const cows = cowRows.map(toCow);
  const latestByCow = new Map(latest.map((r) => [Number(r.cow_id), r]));
  const recent = recentRows.map(toTreatment);

  return cows.map((cow) => {
    const h = latestByCow.get(cow.id);
    const mine = recent.filter((t) => t.cowId === cow.id);
    const holds = mine.filter((t) => isMilkHold(t, today)).map((t) => t.milkSafeFrom).sort();
    return {
      ...cow,
      condition: h ? (String(h.condition) as Condition) : null,
      temperature: h ? num(h.temperature) : null,
      lastCheck: h ? String(h.date) : null,
      onTreatment: mine.some((t) => isActiveTreatment(t, today)),
      milkSafeFrom: holds.at(-1) ?? null,
    };
  });
}

export type CowProfile = {
  cow: CowSummary;
  health: HealthCheck[];
  treatments: Treatment[];
  feeds: FeedLog[];
};

/** Everything the cow page needs, fetched in one parallel round trip keyed by tag. */
export async function getCowProfile(tag: string, today: string, withFeed: boolean): Promise<CowProfile | null> {
  const [cowRow, healthRows, treatmentRows, feedRows] = await Promise.all([
    get("SELECT * FROM cows WHERE tag = ? COLLATE NOCASE", [tag]),
    all(
      `SELECT h.* FROM health_checks h JOIN cows c ON c.id = h.cow_id
       WHERE c.tag = ? COLLATE NOCASE ORDER BY h.date DESC, h.time DESC, h.id DESC LIMIT 50`,
      [tag],
    ),
    all(
      `SELECT t.* FROM treatments t JOIN cows c ON c.id = t.cow_id
       WHERE c.tag = ? COLLATE NOCASE ORDER BY t.start_date DESC, t.id DESC LIMIT 50`,
      [tag],
    ),
    withFeed
      ? all(
          `SELECT f.*, fc.tag AS cow_tag FROM cows c
           JOIN feed_logs f ON f.cow_id = c.id OR (f.group_name IS NOT NULL AND f.group_name = c.group_name COLLATE NOCASE)
           LEFT JOIN cows fc ON fc.id = f.cow_id
           WHERE c.tag = ? COLLATE NOCASE ORDER BY f.date DESC, f.session DESC, f.id DESC LIMIT 30`,
          [tag],
        )
      : Promise.resolve([]),
  ]);
  if (!cowRow) return null;

  const cow = toCow(cowRow);
  const health = healthRows.map(toHealth);
  const treatments = treatmentRows.map(toTreatment);
  const latest = health[0];
  const holds = treatments.filter((t) => isMilkHold(t, today)).map((t) => t.milkSafeFrom).sort();
  return {
    cow: {
      ...cow,
      condition: latest?.condition ?? null,
      temperature: latest?.temperature ?? null,
      lastCheck: latest?.date ?? null,
      onTreatment: treatments.some((t) => isActiveTreatment(t, today)),
      milkSafeFrom: holds.at(-1) ?? null,
    },
    health,
    treatments,
    feeds: feedRows.map(toFeed),
  };
}

export async function getCowByTag(tag: string): Promise<Cow | null> {
  const r = await get("SELECT * FROM cows WHERE tag = ? COLLATE NOCASE", [tag]);
  return r ? toCow(r) : null;
}

export async function getCowById(id: number): Promise<Cow | null> {
  const r = await get("SELECT * FROM cows WHERE id = ?", [id]);
  return r ? toCow(r) : null;
}

export async function listGroups(): Promise<{ name: string; count: number }[]> {
  const rows = await all(
    `SELECT group_name AS name, COUNT(*) AS count FROM cows
     WHERE group_name IS NOT NULL AND group_name != ''
     GROUP BY group_name COLLATE NOCASE ORDER BY group_name COLLATE NOCASE`,
  );
  return rows.map((r) => ({ name: String(r.name), count: Number(r.count) }));
}

export async function listBreeds(): Promise<string[]> {
  const rows = await all("SELECT DISTINCT breed FROM cows WHERE breed IS NOT NULL AND breed != '' ORDER BY breed");
  return rows.map((r) => String(r.breed));
}

export async function insertCow(c: Omit<Cow, "id">) {
  const res = await run(
    "INSERT INTO cows (tag, name, breed, group_name, stage, birth_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [c.tag, c.name, c.breed, c.groupName, c.stage, c.birthDate, c.notes],
  );
  return res.lastInsertRowid;
}

export async function updateCow(c: Cow) {
  await run("UPDATE cows SET tag = ?, name = ?, breed = ?, group_name = ?, stage = ?, birth_date = ?, notes = ? WHERE id = ?", [
    c.tag,
    c.name,
    c.breed,
    c.groupName,
    c.stage,
    c.birthDate,
    c.notes,
    c.id,
  ]);
}

export async function deleteCow(id: number) {
  // Delete child rows explicitly: a remote database may not enforce ON DELETE CASCADE.
  await batch([
    { sql: "DELETE FROM health_checks WHERE cow_id = ?", args: [id] },
    { sql: "DELETE FROM treatments WHERE cow_id = ?", args: [id] },
    { sql: "DELETE FROM feed_logs WHERE cow_id = ?", args: [id] },
    { sql: "DELETE FROM cows WHERE id = ?", args: [id] },
  ]);
}

// ---------- Health ----------

export async function insertHealthCheck(h: Omit<HealthCheck, "id">) {
  await run("INSERT INTO health_checks (cow_id, date, time, condition, temperature, symptoms, note) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    h.cowId,
    h.date,
    h.time,
    h.condition,
    h.temperature,
    JSON.stringify(h.symptoms),
    h.note,
  ]);
}

export async function deleteHealthCheck(id: number) {
  await run("DELETE FROM health_checks WHERE id = ?", [id]);
}

// ---------- Medicine ----------

const TREATMENT_WITH_COW = `SELECT t.*, c.tag AS cow_tag, c.name AS cow_name FROM treatments t JOIN cows c ON c.id = t.cow_id`;

function toTreatmentWithCow(r: Row): TreatmentWithCow {
  return { ...toTreatment(r), cowTag: String(r.cow_tag), cowName: str(r.cow_name) };
}

/** Treatments still running or still holding milk on `today`. */
export async function listCurrentTreatments(today: string): Promise<TreatmentWithCow[]> {
  const rows = await all(`${TREATMENT_WITH_COW} WHERE t.start_date <= ? AND t.start_date >= ? ORDER BY t.start_date DESC`, [
    today,
    addDays(today, -400),
  ]);
  return rows.map(toTreatmentWithCow).filter((t) => isActiveTreatment(t, today) || isMilkHold(t, today));
}

export async function listRecentTreatments(limit = 30): Promise<TreatmentWithCow[]> {
  const rows = await all(`${TREATMENT_WITH_COW} ORDER BY t.start_date DESC, t.id DESC LIMIT ?`, [limit]);
  return rows.map(toTreatmentWithCow);
}

export async function listRecentMedicines(limit = 6): Promise<string[]> {
  const rows = await all("SELECT medicine FROM treatments GROUP BY medicine COLLATE NOCASE ORDER BY MAX(id) DESC LIMIT ?", [limit]);
  return rows.map((r) => String(r.medicine));
}

export type MedicinePreset = Pick<Treatment, "medicine" | "dose" | "unit" | "route" | "timesPerDay" | "days" | "withdrawalDays">;

/** The most recent settings used for each medicine, to prefill the form. */
export async function listMedicinePresets(): Promise<Record<string, MedicinePreset>> {
  const rows = await all("SELECT * FROM treatments WHERE id IN (SELECT MAX(id) FROM treatments GROUP BY medicine COLLATE NOCASE)");
  return Object.fromEntries(
    rows.map((r) => {
      const t = toTreatment(r);
      return [
        t.medicine.toLowerCase(),
        { medicine: t.medicine, dose: t.dose, unit: t.unit, route: t.route, timesPerDay: t.timesPerDay, days: t.days, withdrawalDays: t.withdrawalDays },
      ];
    }),
  );
}

export async function insertTreatments(cowIds: number[], t: Omit<Treatment, "id" | "cowId" | "endDate" | "milkSafeFrom">) {
  await batch(
    cowIds.map((cowId) => ({
      sql: `INSERT INTO treatments (cow_id, start_date, medicine, dose, unit, route, times_per_day, days, withdrawal_days, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [cowId, t.startDate, t.medicine, t.dose, t.unit, t.route, t.timesPerDay, t.days, t.withdrawalDays, t.note],
    })),
  );
}

export async function deleteTreatment(id: number) {
  await run("DELETE FROM treatments WHERE id = ?", [id]);
}

// ---------- Feed ----------

const FEED_WITH_COW = `SELECT f.*, c.tag AS cow_tag FROM feed_logs f LEFT JOIN cows c ON c.id = f.cow_id`;

export async function listFeedLogs(fromDate: string, toDate: string): Promise<FeedLog[]> {
  const rows = await all(`${FEED_WITH_COW} WHERE f.date BETWEEN ? AND ? ORDER BY f.date DESC, f.session DESC, f.id DESC`, [fromDate, toDate]);
  return rows.map(toFeed);
}

/** Last items fed to each group (key "group:<name>") or cow (key "cow:<id>"), per session. */
export async function listLastFeedItems(): Promise<Record<string, FeedItem[]>> {
  const rows = await all(
    `SELECT * FROM feed_logs WHERE id IN (
       SELECT MAX(id) FROM feed_logs GROUP BY COALESCE('group:' || group_name, 'cow:' || cow_id), session)`,
  );
  const out: Record<string, FeedItem[]> = {};
  for (const r of rows) {
    const f = toFeed(r);
    const key = f.groupName ? `group:${f.groupName}` : `cow:${f.cowId}`;
    out[`${key}|${f.session}`] = f.items;
    out[key] ??= f.items;
  }
  return out;
}

export async function insertFeedLog(f: Omit<FeedLog, "id" | "cowTag">) {
  await run("INSERT INTO feed_logs (date, session, group_name, cow_id, head_count, items, note) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    f.date,
    f.session,
    f.groupName,
    f.cowId,
    f.headCount,
    JSON.stringify(f.items),
    f.note,
  ]);
}

export async function deleteFeedLog(id: number) {
  await run("DELETE FROM feed_logs WHERE id = ?", [id]);
}
