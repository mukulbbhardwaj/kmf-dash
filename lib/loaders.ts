import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { requireUser } from "./auth";
import {
  type Session,
  getCowByTag,
  getCowProfile,
  getLastMilkBefore,
  getMilkSession,
  listBreeds,
  listCows,
  listCurrentTreatments,
  listFeedLogs,
  listGroups,
  listHerdMilk,
  listLastFeedItems,
  listMedicinePresets,
  listRecentMedicines,
  listRecentTreatments,
} from "./data";
import { addDays, ageLabel, currentHour, nowTime, todayISO } from "./dates";
import { cowOptions } from "./options";

// Page data loaders.
//
// Each one checks the session and runs all of its queries in parallel, so a page costs
// a single round trip to the database. "use cache: private" keeps the result only in the
// signed-in browser (never in a shared server cache) for STALE_SECONDS, which lets the
// client router prefetch pages and switch tabs instantly. Every server action invalidates
// this cache (app/actions.ts), so your own changes always show immediately.

export const FARM_DATA_TAG = "farm-data";
const STALE_SECONDS = 60;

function cacheForThisBrowser() {
  cacheLife({ stale: STALE_SECONDS, revalidate: STALE_SECONDS, expire: 300 });
  cacheTag(FARM_DATA_TAG);
}

export async function loadHome() {
  "use cache: private";
  cacheForThisBrowser();
  const today = todayISO();
  const [user, cows, treatments, fedToday, groups, milk] = await Promise.all([
    requireUser(),
    listCows(today),
    listCurrentTreatments(today),
    listFeedLogs(today, today),
    listGroups(),
    listHerdMilk(addDays(today, -1), today),
  ]);
  const milkToday = milk.find((d) => d.date === today) ?? null;
  const milkYesterday = milk.find((d) => d.date === addDays(today, -1)) ?? null;
  return { user, today, hour: currentHour(), cows, treatments, fedToday, groups, milkToday, milkYesterday };
}

export async function loadHerd() {
  "use cache: private";
  cacheForThisBrowser();
  const today = todayISO();
  const [, cows] = await Promise.all([requireUser(), listCows(today)]);
  return cows.map((c) => ({ ...c, age: ageLabel(c.birthDate, today) }));
}

export async function loadCow(tag: string, tab: "health" | "medicine" | "feed" | "milk") {
  "use cache: private";
  cacheForThisBrowser();
  const today = todayISO();
  const [user, profile] = await Promise.all([requireUser(), getCowProfile(tag, today, tab)]);
  return { user, today, profile };
}

export async function loadCowForEdit(tag: string) {
  "use cache: private";
  cacheForThisBrowser();
  const [user, cow, groups, breeds] = await Promise.all([requireUser(), getCowByTag(tag), listGroups(), listBreeds()]);
  return { user, cow, groups: groups.map((g) => g.name), breeds };
}

export async function loadMedicine() {
  "use cache: private";
  cacheForThisBrowser();
  const today = todayISO();
  const [, current, recent] = await Promise.all([requireUser(), listCurrentTreatments(today), listRecentTreatments(40)]);
  return { today, current, recent };
}

export async function loadFeed() {
  "use cache: private";
  cacheForThisBrowser();
  const today = todayISO();
  const [, logs, groups] = await Promise.all([requireUser(), listFeedLogs(addDays(today, -13), today), listGroups()]);
  return { today, logs, groups };
}

/** Everything the add/edit forms pick from, in one round trip. */
export async function loadFormOptions() {
  "use cache: private";
  cacheForThisBrowser();
  const today = todayISO();
  const [, cows, groups, breeds, recentMedicines, presets, lastFeedItems] = await Promise.all([
    requireUser(),
    listCows(today),
    listGroups(),
    listBreeds(),
    listRecentMedicines(),
    listMedicinePresets(),
    listLastFeedItems(),
  ]);
  return { today, now: nowTime(), hour: currentHour(), cows: cowOptions(cows), groups, breeds, recentMedicines, presets, lastFeedItems };
}

export async function loadMilk() {
  "use cache: private";
  cacheForThisBrowser();
  const today = todayISO();
  const [, days] = await Promise.all([requireUser(), listHerdMilk(addDays(today, -29), today)]);
  return { today, days };
}

/** One milking's entry sheet: every cow, what's already saved, and last time's litres as a hint. */
export async function loadMilkEntry(date: string | null, session: Session | null) {
  "use cache: private";
  cacheForThisBrowser();
  const today = todayISO();
  const day = date && date <= today ? date : today;
  const sess: Session = session ?? (currentHour() < 12 ? "morning" : "evening");
  const [, cows, saved, last] = await Promise.all([
    requireUser(),
    listCows(day),
    getMilkSession(day, sess),
    getLastMilkBefore(day, sess),
  ]);
  return {
    today,
    date: day,
    session: sess,
    cows: cows.map((c) => ({
      id: c.id,
      tag: c.tag,
      name: c.name,
      groupName: c.groupName,
      stage: c.stage,
      onHold: !!c.milkSafeFrom,
      saved: saved[c.id] ?? null,
      last: last[c.id] ?? null,
    })),
  };
}
