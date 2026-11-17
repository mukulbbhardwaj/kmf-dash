import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DeleteRecordButton } from "@/components/DeleteButton";
import { PlusIcon } from "@/components/icons";
import { MilkChart } from "@/components/MilkChart";
import { CONDITION_LABEL, Empty, Loading, MilkHoldBanner, PageHeader, TagBadge } from "@/components/ui";
import { type Condition, isActiveTreatment, isMilkHold, treatmentDay } from "@/lib/data";
import { addDays, ageLabel, fmtDay, fmtRelative } from "@/lib/dates";
import { loadCow } from "@/lib/loaders";

export async function generateMetadata({ params }: PageProps<"/cows/[tag]">) {
  const { tag } = await params;
  return { title: `Cow ${decodeURIComponent(tag)}` };
}

export default function CowPage(props: PageProps<"/cows/[tag]">) {
  return (
    <Suspense fallback={<Loading />}>
      <CowProfile {...props} />
    </Suspense>
  );
}

const TABS = [
  { key: "health", label: "Health" },
  { key: "milk", label: "Milk" },
  { key: "medicine", label: "Medicine" },
  { key: "feed", label: "Feed" },
] as const;

const DOT: Record<Condition, string> = { healthy: "#1d6b45", watch: "#d97706", sick: "#c0392b" };

async function CowProfile({ params, searchParams }: PageProps<"/cows/[tag]">) {
  const { tag: rawTag } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = TABS.some((t) => t.key === rawTab) ? (rawTab as (typeof TABS)[number]["key"]) : "health";

  const { today, profile } = await loadCow(decodeURIComponent(rawTag), tab);
  if (!profile) notFound();
  const { cow, health, treatments, feeds, milk } = profile;
  const summary = cow;
  const base = `/cows/${encodeURIComponent(cow.tag)}`;
  const q = `?tag=${encodeURIComponent(cow.tag)}`;

  const age = ageLabel(cow.birthDate, today);
  const stageLabel = { milking: "Milking", dry: "Dry", heifer: "Heifer", calf: "Calf" }[cow.stage];

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-line bg-surface pb-4">
        <PageHeader
          title=""
          back="/cows"
          action={
            <Link href={`${base}/edit`} className="flex h-10 items-center rounded-full border border-line px-3.5 text-sm font-semibold">
              Edit
            </Link>
          }
        />
        <div className="flex items-center gap-3.5 px-5 pt-2">
          <TagBadge tag={cow.tag} size="lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="truncate font-display text-2xl font-extrabold">{cow.name ?? "No name"}</h1>
            <span className="text-[13px] text-muted">{[cow.breed, age, cow.groupName, stageLabel].filter(Boolean).join(" · ")}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3.5 px-5 pt-4 pb-32">
        {summary.milkSafeFrom && <MilkHoldBanner until={summary.milkSafeFrom} />}

        <div className="grid grid-cols-3 gap-2">
          <Stat label="Status" value={summary.condition ? CONDITION_LABEL[summary.condition] : "–"} tone={summary.condition === "sick" ? "text-bad" : summary.condition === "watch" ? "text-warn" : ""} />
          <Stat label="Temp" value={summary.temperature != null ? `${summary.temperature} °C` : "–"} />
          <Stat label="Last check" value={summary.lastCheck ? fmtRelative(summary.lastCheck, today) : "Never"} />
        </div>

        {cow.notes && <p className="rounded-2xl bg-chip px-3.5 py-3 text-sm text-subtle">{cow.notes}</p>}

        <nav aria-label="Records" className="grid grid-cols-4 gap-1 rounded-xl bg-track p-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`${base}?tab=${t.key}`}
              replace
              scroll={false}
              aria-current={tab === t.key ? "page" : undefined}
              className={`flex h-10 items-center justify-center rounded-[9px] text-sm ${tab === t.key ? "bg-surface font-bold shadow-sm" : "font-semibold text-subtle"}`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {tab === "health" && (
          <Timeline empty="No health checks yet.">
            {health.map((h) => (
              <TimelineItem
                key={h.id}
                color={DOT[h.condition]}
                title={`${CONDITION_LABEL[h.condition]}${h.temperature != null ? ` · ${h.temperature} °C` : ""}`}
                when={`${fmtRelative(h.date, today)}${h.time ? ` ${h.time}` : ""}`}
                detail={[h.symptoms.join(", "), h.note].filter(Boolean).join(". ")}
                del={<DeleteRecordButton kind="health" id={h.id} back={`${base}?tab=health`} label="health check" />}
              />
            ))}
          </Timeline>
        )}

        {tab === "milk" && <MilkTab milk={milk} today={today} onHold={!!summary.milkSafeFrom} />}

        {tab === "medicine" && (
          <Timeline empty="No medicine given yet.">
            {treatments.map((t) => {
              const active = isActiveTreatment(t, today);
              const hold = isMilkHold(t, today);
              return (
                <TimelineItem
                  key={t.id}
                  color={active ? "#c0392b" : hold ? "#d97706" : "#9aa39c"}
                  title={t.medicine}
                  when={fmtRelative(t.startDate, today)}
                  detail={[
                    [t.dose != null ? `${t.dose} ${t.unit}` : null, t.route, `${t.timesPerDay}× a day`, `${t.days} ${t.days === 1 ? "day" : "days"}`].filter(Boolean).join(" · ") + ".",
                    active ? `Day ${treatmentDay(t, today)} of ${t.days}.` : null,
                    t.withdrawalDays > 0 ? `Milk safe from ${fmtDay(t.milkSafeFrom)}.` : null,
                    t.note,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  del={<DeleteRecordButton kind="medicine" id={t.id} back={`${base}?tab=medicine`} label="medicine record" />}
                />
              );
            })}
          </Timeline>
        )}

        {tab === "feed" && (
          <Timeline empty={cow.groupName ? `No feed logged for ${cow.groupName} yet.` : "No feed logged yet."}>
            {feeds.map((f) => {
              const perCow = (q: number) => Math.round((q / Math.max(1, f.headCount)) * 100) / 100;
              return (
                <TimelineItem
                  key={f.id}
                  color="#1d6b45"
                  title={`${f.session === "morning" ? "Morning" : "Evening"}${f.groupName ? ` · ${f.groupName}` : ""}`}
                  when={fmtRelative(f.date, today)}
                  detail={f.items.map((i) => `${i.name} ${perCow(i.qty)} ${i.unit}`).join(", ") + (f.groupName ? " (per cow)" : "")}
                />
              );
            })}
          </Timeline>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 z-10 grid w-full max-w-md -translate-x-1/2 grid-cols-4 gap-1.5 border-t border-line bg-surface px-4 pt-3 pb-[max(env(safe-area-inset-bottom),20px)]">
        <Link href={`/health/new${q}`} className="flex h-13 items-center justify-center gap-1 rounded-2xl bg-brand text-[13px] font-bold text-white">
          <PlusIcon size={14} /> Health
        </Link>
        <Link href="/milk/new" className="flex h-13 items-center justify-center gap-1 rounded-2xl bg-brand-soft text-[13px] font-bold text-brand-ink">
          <PlusIcon size={14} /> Milk
        </Link>
        <Link href={`/medicine/new${q}`} className="flex h-13 items-center justify-center gap-1 rounded-2xl bg-brand-soft text-[13px] font-bold text-brand-ink">
          <PlusIcon size={14} /> Medicine
        </Link>
        <Link
          href={`/feed/new?target=${encodeURIComponent(`cow:${cow.id}`)}`}
          className="flex h-13 items-center justify-center gap-1 rounded-2xl bg-brand-soft text-[13px] font-bold text-brand-ink"
        >
          <PlusIcon size={14} /> Feed
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-surface p-3">
      <span className="text-xs text-muted">{label}</span>
      <span className={`truncate text-[15px] font-bold ${tone}`}>{value}</span>
    </div>
  );
}

function Timeline({ children, empty }: { children: React.ReactNode[]; empty: string }) {
  if (children.length === 0) return <Empty>{empty}</Empty>;
  return <ol className="flex flex-col">{children}</ol>;
}

function TimelineItem({ color, title, when, detail, del }: { color: string; title: string; when: string; detail?: string; del?: React.ReactNode }) {
  return (
    <li className="group flex gap-3">
      <div className="flex w-3.5 flex-col items-center">
        <span className="mt-1 size-3.5 rounded-full border-[3px] border-ground" style={{ background: color, boxShadow: `0 0 0 2px ${color}` }} />
        <span className="w-0.5 flex-1 bg-[#dde1d8] group-last:bg-transparent" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-bold">{title}</span>
          <span className="flex items-center gap-1 text-xs whitespace-nowrap text-muted">
            {when}
            {del}
          </span>
        </div>
        {detail && <span className="text-[13px] leading-snug text-subtle">{detail}</span>}
      </div>
    </li>
  );
}

function MilkTab({ milk, today, onHold }: { milk: { date: string; morning: number | null; evening: number | null; total: number }[]; today: string; onHold: boolean }) {
  if (milk.length === 0) return <Empty>No milk logged for this cow in the last 30 days.</Empty>;
  const fmt = (n: number) => String(Math.round(n * 10) / 10);
  const avg = (from: number, to: number) => {
    const days = milk.filter((d) => d.date > addDays(today, -from) && d.date <= addDays(today, -to));
    return days.length ? days.reduce((s, d) => s + d.total, 0) / days.length : null;
  };
  // Complete days only: today may still be missing the evening milking.
  const thisWeek = avg(8, 1);
  const lastWeek = avg(15, 8);
  const change = thisWeek != null && lastWeek ? ((thisWeek - lastWeek) / lastWeek) * 100 : null;
  const best = Math.max(...milk.map((d) => d.total));

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="7-day avg" value={thisWeek != null ? `${fmt(thisWeek)} L` : "–"} />
        <Stat
          label="vs week before"
          value={change != null ? `${change >= 0 ? "▲" : "▼"} ${Math.abs(Math.round(change))}%` : "–"}
          tone={change != null && change <= -10 ? "text-bad" : ""}
        />
        <Stat label="Best day" value={`${fmt(best)} L`} />
      </div>
      {onHold && <p className="text-xs text-warn">Milk from this cow is on hold. Log it, but don&apos;t sell it.</p>}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <MilkChart days={milk} today={today} label="This cow's milk per day, last 14 days" />
      </div>
      <div className="flex flex-col rounded-2xl border border-line bg-surface">
        {[...milk].reverse().slice(0, 10).map((d) => (
          <div key={d.date} className="flex items-center justify-between border-b border-divider px-3.5 py-2.5 text-sm last:border-0">
            <span className="font-semibold">{fmtRelative(d.date, today)}</span>
            <span className="text-xs text-muted">
              M {d.morning != null ? fmt(d.morning) : "–"} · E {d.evening != null ? fmt(d.evening) : "–"}
            </span>
            <span className="w-16 text-right font-bold tabular-nums">{fmt(d.total)} L</span>
          </div>
        ))}
      </div>
    </div>
  );
}
