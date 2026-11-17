import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PlusIcon } from "@/components/icons";
import { Card, Empty, Loading, Pill, SectionTitle } from "@/components/ui";
import { type TreatmentWithCow, isActiveTreatment, isMilkHold, treatmentDay } from "@/lib/data";
import { fmtDay, fmtRelative } from "@/lib/dates";
import { loadMedicine } from "@/lib/loaders";

export const metadata: Metadata = { title: "Medicine" };

export default function MedicinePage() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-[max(env(safe-area-inset-top),24px)]">
      <div className="flex items-center justify-between pt-4">
        <h1 className="font-display text-[26px] font-extrabold tracking-tight">Medicine</h1>
        <Link href="/medicine/new" className="flex h-10 items-center gap-1.5 rounded-full bg-ink px-3.5 text-sm font-semibold text-white">
          <PlusIcon size={16} /> Give medicine
        </Link>
      </div>
      <Suspense fallback={<Loading />}>
        <MedicineLists />
      </Suspense>
    </div>
  );
}

async function MedicineLists() {
  const { today, current, recent } = await loadMedicine();
  const active = current.filter((t) => isActiveTreatment(t, today));
  const holdOnly = current.filter((t) => !isActiveTreatment(t, today));
  const currentIds = new Set(current.map((t) => t.id));
  const past = recent.filter((t) => !currentIds.has(t.id));

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <SectionTitle aside={active.length || undefined}>Being treated</SectionTitle>
        {active.length === 0 ? <Empty>No cow is on medicine right now.</Empty> : <List items={active} today={today} />}
      </section>

      {holdOnly.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle aside={holdOnly.length}>Milk on hold</SectionTitle>
          <List items={holdOnly} today={today} />
        </section>
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle>History</SectionTitle>
          <List items={past} today={today} />
        </section>
      )}
    </>
  );
}

function List({ items, today }: { items: TreatmentWithCow[]; today: string }) {
  return (
    <Card className="flex flex-col">
      {items.map((t) => {
        const active = isActiveTreatment(t, today);
        const hold = isMilkHold(t, today);
        return (
          <Link
            key={t.id}
            href={`/cows/${encodeURIComponent(t.cowTag)}?tab=medicine`}
            className="flex items-center gap-3 border-b border-divider px-3.5 py-3 last:border-0"
          >
            <span className="flex h-8.5 min-w-14.5 items-center justify-center rounded-[10px] bg-chip px-2 font-display text-[15px] font-extrabold">{t.cowTag}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold">{t.medicine}</span>
              <span className="truncate text-xs text-muted">
                {active
                  ? `Day ${treatmentDay(t, today)} of ${t.days}${t.dose != null ? ` · ${t.dose} ${t.unit}` : ""} · ${t.timesPerDay}× a day`
                  : `${fmtRelative(t.startDate, today)} · ${t.days} ${t.days === 1 ? "day" : "days"}`}
              </span>
            </span>
            {hold && <Pill tone="hold">Milk {fmtDay(t.milkSafeFrom)}</Pill>}
          </Link>
        );
      })}
    </Card>
  );
}
