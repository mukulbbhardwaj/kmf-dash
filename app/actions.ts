"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import {
  type Condition,
  type FeedItem,
  type Session,
  type Stage,
  deleteCow,
  deleteFeedLog,
  deleteHealthCheck,
  deleteTreatment,
  getCowById,
  getCowByTag,
  insertCow,
  insertFeedLog,
  insertHealthCheck,
  insertTreatments,
  listCows,
  saveMilkSession,
  updateCow,
} from "@/lib/data";
import { requireAdmin, requireUser } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { FARM_DATA_TAG } from "@/lib/loaders";

export type FormState = { error?: string; ok?: string };

const CONDITIONS: Condition[] = ["healthy", "watch", "sick"];
const STAGES: Stage[] = ["milking", "dry", "heifer", "calf"];
const SESSIONS: Session[] = ["morning", "evening"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(fd: FormData, key: string) {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}

function number(fd: FormData, key: string) {
  const s = text(fd, key);
  if (s == null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function date(fd: FormData, key: string) {
  const s = text(fd, key);
  return s && DATE_RE.test(s) ? s : todayISO();
}

function done(path: string): never {
  // Drop cached page data (lib/loaders.ts) so the next screen shows this change.
  updateTag(FARM_DATA_TAG);
  revalidatePath("/", "layout");
  redirect(path);
}

// ---------- Cows ----------

export async function saveCow(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const id = number(fd, "id");
  const tag = text(fd, "tag");
  if (!tag) return { error: "Enter the tag number." };
  if (!/^[\w-]{1,20}$/.test(tag)) return { error: "Tag can only have letters, numbers and dashes." };

  const existing = await getCowByTag(tag);
  if (existing && existing.id !== id) return { error: `Tag ${tag} is already used by another cow.` };

  const stage = text(fd, "stage") as Stage;
  const cow = {
    tag,
    name: text(fd, "name"),
    breed: text(fd, "breed"),
    groupName: text(fd, "group"),
    stage: STAGES.includes(stage) ? stage : "milking",
    birthDate: text(fd, "birth_date"),
    notes: text(fd, "notes"),
  };

  if (id) await updateCow({ id, ...cow });
  else await insertCow(cow);
  done(`/cows/${encodeURIComponent(tag)}`);
}

export async function removeCow(fd: FormData) {
  await requireAdmin();
  const id = number(fd, "id");
  if (id) await deleteCow(id);
  done("/cows");
}

// ---------- Health ----------

export async function saveHealthCheck(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const cow = await getCowById(number(fd, "cow_id") ?? 0);
  if (!cow) return { error: "Pick a cow by tag number." };

  const condition = text(fd, "condition") as Condition;
  if (!CONDITIONS.includes(condition)) return { error: "Choose Healthy, Watch or Sick." };

  const temperature = number(fd, "temperature");
  if (temperature != null && (temperature < 30 || temperature > 45)) {
    return { error: "Temperature looks wrong — enter it in °C." };
  }

  await insertHealthCheck({
    cowId: cow.id,
    date: date(fd, "date"),
    time: text(fd, "time"),
    condition,
    temperature,
    symptoms: fd.getAll("symptoms").map(String).filter(Boolean),
    note: text(fd, "note"),
  });
  done(`/cows/${encodeURIComponent(cow.tag)}?tab=health`);
}

// ---------- Medicine ----------

export async function saveTreatment(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const wanted = [...new Set(fd.getAll("cow_id").map(Number))];
  const cowIds = (await Promise.all(wanted.map((id) => getCowById(id)))).filter((c) => c != null).map((c) => c.id);
  if (cowIds.length === 0) return { error: "Pick at least one cow by tag number." };

  const medicine = text(fd, "medicine");
  if (!medicine) return { error: "Enter the medicine name." };

  const clampInt = (v: number | null, min: number, max: number, fallback: number) =>
    v == null ? fallback : Math.min(max, Math.max(min, Math.round(v)));

  const base = {
    startDate: date(fd, "start_date"),
    medicine,
    dose: number(fd, "dose"),
    unit: text(fd, "unit") ?? "ml",
    route: text(fd, "route"),
    timesPerDay: clampInt(number(fd, "times_per_day"), 1, 6, 1),
    days: clampInt(number(fd, "days"), 1, 90, 1),
    withdrawalDays: clampInt(number(fd, "withdrawal_days"), 0, 120, 0),
    note: text(fd, "note"),
  };
  await insertTreatments(cowIds, base);

  if (cowIds.length === 1) {
    const cow = (await getCowById(cowIds[0]))!;
    done(`/cows/${encodeURIComponent(cow.tag)}?tab=medicine`);
  }
  done("/medicine");
}

// ---------- Feed ----------

export async function saveFeedLog(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const session = text(fd, "session") as Session;
  if (!SESSIONS.includes(session)) return { error: "Choose Morning or Evening." };

  const target = text(fd, "target") ?? "";
  let groupName: string | null = null;
  let cowId: number | null = null;
  let headCount = 1;

  if (target.startsWith("group:")) {
    groupName = target.slice("group:".length);
    const today = todayISO();
    headCount = (await listCows(today)).filter((c) => c.groupName?.toLowerCase() === groupName!.toLowerCase()).length;
    if (headCount === 0) return { error: "That group has no cows." };
  } else if (target.startsWith("cow:")) {
    const cow = await getCowById(Number(target.slice("cow:".length)));
    if (!cow) return { error: "Pick a cow by tag number." };
    cowId = cow.id;
  } else {
    return { error: "Choose a group or a cow." };
  }

  let items: FeedItem[] = [];
  try {
    items = (JSON.parse(text(fd, "items") ?? "[]") as FeedItem[])
      .map((i) => ({ name: String(i.name).trim(), qty: Math.round(Number(i.qty) * 1000) / 1000, unit: String(i.unit || "kg") }))
      .filter((i) => i.name && Number.isFinite(i.qty) && i.qty > 0);
  } catch {
    return { error: "Could not read the feed amounts." };
  }
  if (items.length === 0) return { error: "Enter at least one feed amount." };

  await insertFeedLog({ date: date(fd, "date"), session, groupName, cowId, headCount, items, note: text(fd, "note") });
  done("/feed");
}

// ---------- Milk ----------

export async function saveMilk(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const session = text(fd, "session") as Session;
  if (!SESSIONS.includes(session)) return { error: "Choose Morning or Evening." };
  const day = date(fd, "date");
  if (day > todayISO()) return { error: "That date is in the future." };

  let entries: { cowId: number; litres: number | null }[];
  try {
    entries = (JSON.parse(text(fd, "entries") ?? "[]") as { cowId: unknown; litres: unknown }[]).map((e) => ({
      cowId: Number(e.cowId),
      litres: e.litres == null || e.litres === "" ? null : Math.round(Number(e.litres) * 100) / 100,
    }));
  } catch {
    return { error: "Could not read the milk amounts." };
  }
  const bad = entries.find((e) => !Number.isInteger(e.cowId) || (e.litres != null && !(e.litres >= 0 && e.litres <= 80)));
  if (bad) return { error: "Litres must be between 0 and 80 for each cow." };

  await saveMilkSession(day, session, entries);
  done("/milk");
}

// ---------- Deleting records ----------

export async function removeRecord(fd: FormData) {
  await requireUser();
  const id = number(fd, "id");
  const kind = text(fd, "kind");
  const back = text(fd, "back") ?? "/";
  if (id) {
    if (kind === "health") await deleteHealthCheck(id);
    if (kind === "medicine") await deleteTreatment(id);
    if (kind === "feed") await deleteFeedLog(id);
  }
  done(back.startsWith("/") && !back.startsWith("//") ? back : "/");
}
