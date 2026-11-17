// Dates are stored as "YYYY-MM-DD" strings in the farm's own calendar. Arithmetic is
// done in UTC so a date never shifts across a timezone boundary.

// Servers (e.g. Vercel) run in UTC, so "today" must come from the farm's timezone.
export const FARM_TIMEZONE = process.env.NEXT_PUBLIC_FARM_TIMEZONE ?? "Asia/Kolkata";

const farmClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: FARM_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function farmNow(now: Date) {
  const p = Object.fromEntries(farmClock.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour), time: `${p.hour}:${p.minute}` };
}

export function todayISO(now = new Date()) {
  return farmNow(now).date;
}

export function nowTime(now = new Date()) {
  return farmNow(now).time;
}

export function currentHour(now = new Date()) {
  return farmNow(now).hour;
}

function toUTC(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(iso: string, days: number) {
  const d = toUTC(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(later: string, earlier: string) {
  return Math.round((toUTC(later).getTime() - toUTC(earlier).getTime()) / 86_400_000);
}

export function fmtDay(iso: string) {
  return toUTC(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function fmtLongDay(iso: string) {
  return toUTC(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function fmtRelative(iso: string, today: string) {
  const diff = diffDays(today, iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return fmtDay(iso);
}

export function ageLabel(birthDate: string | null, today: string) {
  if (!birthDate) return null;
  const months = Math.floor(diffDays(today, birthDate) / 30.44);
  if (months < 0) return null;
  if (months < 24) return `${months} mo`;
  return `${Math.floor(months / 12)} yrs`;
}
