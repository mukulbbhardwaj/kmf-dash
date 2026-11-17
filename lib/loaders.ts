import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { requireUser } from "./auth";
import {
  getCowByTag,
  getCowProfile,
  listBreeds,
  listCows,
  listCurrentTreatments,
  listFeedLogs,
  listGroups,
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
  const [user, cows, treatments, fedToday, groups] = await Promise.all([
    requireUser(),
    listCows(today),
    listCurrentTreatments(today),
    listFeedLogs(today, today),
    listGroups(),
  ]);
  return { user, today, hour: currentHour(), cows, treatments, fedToday, groups };
}

export async function loadHerd() {
  "use cache: private";
  cacheForThisBrowser();
  const today = todayISO();
  const [, cows] = await Promise.all([requireUser(), listCows(today)]);
  return cows.map((c) => ({ ...c, age: ageLabel(c.birthDate, today) }));
}

export async function loadCow(tag: string, tab: "health" | "medicine" | "feed") {
  "use cache: private";
  cacheForThisBrowser();
  const today = todayISO();
  const [user, profile] = await Promise.all([requireUser(), getCowProfile(tag, today, tab === "feed")]);
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
