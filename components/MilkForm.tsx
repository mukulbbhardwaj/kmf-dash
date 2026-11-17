"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import { saveMilk, type FormState } from "@/app/actions";
import type { Session } from "@/lib/data";
import { SaveBar, Segmented, inputClass } from "./form";
import { Pill } from "./ui";

export type MilkRow = {
  id: number;
  tag: string;
  name: string | null;
  groupName: string | null;
  stage: string;
  onHold: boolean;
  saved: number | null;
  last: number | null;
};

export function MilkForm({ date, session, today, cows }: { date: string; session: Session; today: string; cows: MilkRow[] }) {
  const router = useRouter();
  const [state, action] = useActionState<FormState, FormData>(saveMilk, {});
  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(cows.filter((c) => c.saved != null).map((c) => [c.id, String(c.saved)])),
  );
  const [showAll, setShowAll] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Milking cows, plus any other cow that already has a value for this milking.
  const shown = showAll ? cows : cows.filter((c) => c.stage === "milking" || c.saved != null || values[c.id]);
  const hiddenCount = cows.length - shown.length;

  const parsed = (id: number) => {
    const raw = values[id]?.trim().replace(",", ".");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : NaN;
  };

  let total = 0;
  let count = 0;
  let invalid = 0;
  const changes: { cowId: number; litres: number | null }[] = [];
  for (const c of cows) {
    const v = parsed(c.id);
    if (Number.isNaN(v)) {
      invalid++; // never sent, so a typo can't wipe a saved value
      continue;
    }
    if (v != null) {
      total += v;
      count++;
    }
    if (v !== c.saved) changes.push({ cowId: c.id, litres: v });
  }

  const go = (d: string, s: Session) => router.replace(`/milk/new?date=${d}&session=${s}`, { scroll: false });
  const fillFromLast = () =>
    setValues((cur) => {
      const next = { ...cur };
      for (const c of shown) if (!next[c.id] && c.last != null) next[c.id] = String(c.last);
      return next;
    });
  const hasLast = shown.some((c) => !values[c.id] && c.last != null);

  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="session" value={session} />
      <input type="hidden" name="entries" value={JSON.stringify(changes)} />

      <div className="flex flex-col gap-4 px-5 pt-3 pb-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <Segmented
            label="Milking"
            value={session}
            onChange={(s) => go(date, s)}
            options={[
              { value: "morning", label: "Morning" },
              { value: "evening", label: "Evening" },
            ]}
          />
          <label className="sr-only" htmlFor="milk-date">
            Date
          </label>
          <input
            id="milk-date"
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && go(e.target.value, session)}
            className={`${inputClass} h-12 w-40`}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-[13px] font-bold text-subtle">Litres per cow</span>
          {hasLast && (
            <button type="button" onClick={fillFromLast} className="h-9 px-1 text-[13px] font-bold text-brand">
              Fill empty with last time
            </button>
          )}
        </div>

        <div className="flex flex-col rounded-2xl border border-line bg-surface">
          {shown.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted">No milking cows. Show all cows below.</p>}
          {shown.map((c, i) => {
            const v = parsed(c.id);
            return (
              <div key={c.id} className="flex items-center gap-3 border-b border-divider py-2 pr-2 pl-3 last:border-0">
                <span className="flex h-10 min-w-14 items-center justify-center rounded-[10px] bg-chip px-2 font-display text-[15px] font-extrabold">
                  {c.tag}
                </span>
                <label htmlFor={`milk-${c.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">{c.name ?? "No name"}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {c.last != null ? `Last ${c.last} L` : "No previous"}
                    {c.onHold && <Pill tone="hold">Don&apos;t sell</Pill>}
                  </span>
                </label>
                <div className="flex items-baseline gap-1">
                  <input
                    id={`milk-${c.id}`}
                    ref={(el) => {
                      inputs.current[i] = el;
                    }}
                    inputMode="decimal"
                    enterKeyHint={i === shown.length - 1 ? "done" : "next"}
                    autoComplete="off"
                    placeholder={c.last != null ? String(c.last) : "–"}
                    value={values[c.id] ?? ""}
                    onChange={(e) => setValues((cur) => ({ ...cur, [c.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        inputs.current[i + 1]?.focus();
                      }
                    }}
                    aria-invalid={Number.isNaN(v) || undefined}
                    className={`h-12 w-20 rounded-xl border bg-ground px-2 text-right font-display text-lg font-extrabold outline-none placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-[#9aa39c] focus:border-brand focus:ring-2 focus:ring-brand/20 ${
                      Number.isNaN(v) ? "border-bad" : "border-line"
                    }`}
                  />
                  <span className="text-xs font-semibold text-muted">L</span>
                </div>
              </div>
            );
          })}
        </div>

        {(hiddenCount > 0 || showAll) && (
          <button type="button" onClick={() => setShowAll((s) => !s)} className="h-10 self-start text-[13px] font-bold text-brand">
            {showAll ? "Show milking cows only" : `Show all cows (${hiddenCount} more)`}
          </button>
        )}
      </div>

      <SaveBar
        label={changes.length === 0 ? "No changes" : `Save ${session} milk`}
        error={invalid ? `Fix ${invalid} amount${invalid === 1 ? "" : "s"} marked in red (numbers only).` : state.error}
      >
        <div className="flex items-center justify-between rounded-xl bg-brand-soft px-3.5 py-2 text-brand-ink">
          <span className="text-[13px] font-semibold">
            {count} {count === 1 ? "cow" : "cows"} entered
          </span>
          <span className="text-sm font-extrabold">{Math.round(total * 10) / 10} L total</span>
        </div>
      </SaveBar>
    </form>
  );
}
