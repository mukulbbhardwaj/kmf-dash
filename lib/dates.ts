// Dates are stored as local-calendar "YYYY-MM-DD" strings. Arithmetic is done in
// UTC so a date never shifts across a timezone boundary.

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function nowTime(now = new Date()) {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
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
