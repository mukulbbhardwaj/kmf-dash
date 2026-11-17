import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlusIcon } from "@/components/icons";
import { MilkChart } from "@/components/MilkChart";
import { Card, Empty, Loading, SectionTitle } from "@/components/ui";
import { addDays, fmtRelative } from "@/lib/dates";
import { loadMilk } from "@/lib/loaders";

export const metadata: Metadata = { title: "Milk" };

export default function MilkPage() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-[max(env(safe-area-inset-top),24px)]">
      <div className="flex items-center justify-between pt-4">
        <h1 className="font-display text-[26px] font-extrabold tracking-tight">Milk</h1>
        <Link href="/milk/new" prefetch={true} className="flex h-10 items-center gap-1.5 rounded-full bg-ink px-3.5 text-sm font-semibold text-white">
          <PlusIcon size={16} /> Log milk
        </Link>
      </div>
      <Suspense fallback={<Loading />}>
        <MilkOverview />
      </Suspense>
    </div>
  );
}

async function MilkOverview() {
  const { today, days } = await loadMilk();
  const todayRow = days.find((d) => d.date === today);
  const last7 = days.filter((d) => d.date > addDays(today, -7) && d.date < today);
  const avg7 = last7.length ? last7.reduce((s, d) => s + d.total, 0) / last7.length : null;
  const recent = [...days].reverse().slice(0, 14);

  if (days.length === 0) {
    return (
      <Empty>
        <p className="mb-3">No milk logged yet.</p>
        <Link href="/milk/new" className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-brand px-4 font-bold text-white">
          <PlusIcon size={16} /> Log first milking
        </Link>
      </Empty>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Today" value={todayRow ? `${fmt(todayRow.total)} L` : "–"} />
        <Stat label="Sellable today" value={todayRow ? `${fmt(todayRow.total - todayRow.held)} L` : "–"} />
        <Stat label="7-day avg" value={avg7 != null ? `${fmt(avg7)} L` : "–"} />
      </div>

      {todayRow && todayRow.held > 0 && (
        <p className="rounded-2xl bg-warn-soft px-3.5 py-3 text-sm text-warn">
          <strong>{fmt(todayRow.held)} L</strong> today is from cows on medicine withdrawal. Keep it separate; don&apos;t sell it.
        </p>
      )}

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Herd milk, last 14 days</SectionTitle>
        <Card className="p-4">
          <MilkChart days={days} today={today} label="Herd milk per day, last 14 days" />
        </Card>
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>By day</SectionTitle>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider text-left text-xs text-muted">
                <th className="px-3.5 py-2.5 font-semibold">Day</th>
                <th className="px-2 py-2.5 text-right font-semibold">Morning</th>
                <th className="px-2 py-2.5 text-right font-semibold">Evening</th>
                <th className="px-3.5 py-2.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((d) => (
                <tr key={d.date} className="border-b border-divider last:border-0">
                  <td className="px-3.5 py-2.5">
                    <span className="font-semibold">{fmtRelative(d.date, today)}</span>
                    <span className="block text-xs text-muted">
                      {d.cows} {d.cows === 1 ? "cow" : "cows"}
                      {d.held > 0 && ` · ${fmt(d.held)} L on hold`}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">
                    <Link href={`/milk/new?date=${d.date}&session=morning`} className="text-ink no-underline">
                      {d.morning != null ? fmt(d.morning) : "–"}
                    </Link>
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">
                    <Link href={`/milk/new?date=${d.date}&session=evening`} className="text-ink no-underline">
                      {d.evening != null ? fmt(d.evening) : "–"}
                    </Link>
                  </td>
                  <td className="px-3.5 py-2.5 text-right font-bold tabular-nums">{fmt(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="text-xs text-muted">Litres. Tap a morning or evening amount to edit that milking.</p>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-surface p-3">
      <span className="text-xs text-muted">{label}</span>
      <span className="truncate font-display text-lg font-extrabold">{value}</span>
    </div>
  );
}

function fmt(n: number) {
  return String(Math.round(n * 10) / 10);
}
