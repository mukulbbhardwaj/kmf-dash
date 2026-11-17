"use client";

import { useState } from "react";
import { addDays, fmtDay } from "@/lib/dates";

type Day = { date: string; total: number; morning: number | null; evening: number | null };

const BAR = "#15803d"; // validated against the white card surface (dataviz validator)

/** Daily litres as bars, one per day ending today. Tap or hover a bar to read it. */
export function MilkChart({ days, today, span = 14, label }: { days: Day[]; today: string; span?: number; label: string }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const slots = Array.from({ length: span }, (_, i) => {
    const date = addDays(today, i - span + 1);
    return { date, day: byDate.get(date) ?? null };
  });
  const max = Math.max(1, ...slots.map((s) => s.day?.total ?? 0));
  const latest = [...slots].reverse().find((s) => s.day) ?? null;
  const [active, setActive] = useState<string | null>(null);
  const shown = slots.find((s) => s.date === active) ?? latest;

  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="flex min-h-10 items-baseline justify-between gap-2" aria-live="polite">
        {shown?.day ? (
          <>
            <span className="text-[13px] text-muted">{fmtDay(shown.date)}</span>
            <span className="text-right">
              <span className="font-display text-xl font-extrabold">{fmt(shown.day.total)} L</span>
              <span className="block text-xs text-muted">
                Morning {shown.day.morning != null ? `${fmt(shown.day.morning)} L` : "–"} · Evening{" "}
                {shown.day.evening != null ? `${fmt(shown.day.evening)} L` : "–"}
              </span>
            </span>
          </>
        ) : (
          <span className="text-[13px] text-muted">{shown ? `${fmtDay(shown.date)} · not logged` : "No milk logged yet"}</span>
        )}
      </div>

      <div
        role="img"
        aria-label={`${label}: ${slots.filter((s) => s.day).map((s) => `${fmtDay(s.date)} ${fmt(s.day!.total)} litres`).join(", ") || "no data"}`}
        className="flex h-28 items-end gap-0.5 border-b border-line"
        onMouseLeave={() => setActive(null)}
      >
        {slots.map((s) => (
          <button
            key={s.date}
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onMouseEnter={() => setActive(s.date)}
            onClick={() => setActive(s.date)}
            className="flex h-full min-w-0 flex-1 items-end"
          >
            <span
              className="w-full rounded-t-[4px]"
              style={{
                height: s.day ? `${Math.max(3, (s.day.total / max) * 100)}%` : 0,
                background: BAR,
                opacity: shown && shown.date !== s.date ? 0.55 : 1,
              }}
            />
          </button>
        ))}
      </div>
      <figcaption className="flex justify-between text-[11px] text-muted">
        <span>{fmtDay(slots[0].date)}</span>
        <span>Today</span>
      </figcaption>
    </figure>
  );
}

function fmt(n: number) {
  return String(Math.round(n * 10) / 10);
}
