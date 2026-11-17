import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { DeleteRecordButton } from "@/components/DeleteButton";
import { PlusIcon } from "@/components/icons";
import { CONDITION_LABEL, Empty, Loading, MilkHoldBanner, PageHeader, TagBadge } from "@/components/ui";
import {
  type Condition,
  getCowByTag,
  isActiveTreatment,
  isMilkHold,
  listCows,
  listFeedLogsForCow,
  listHealthChecks,
  listTreatments,
  treatmentDay,
} from "@/lib/data";
import { ageLabel, fmtDay, fmtRelative, todayISO } from "@/lib/dates";

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
  { key: "medicine", label: "Medicine" },
  { key: "feed", label: "Feed" },
] as const;

const DOT: Record<Condition, string> = { healthy: "#1d6b45", watch: "#d97706", sick: "#c0392b" };

async function CowProfile({ params, searchParams }: PageProps<"/cows/[tag]">) {
  const { tag: rawTag } = await params;
  const { tab: rawTab } = await searchParams;
  await requireUser();

  const cow = await getCowByTag(decodeURIComponent(rawTag));
  if (!cow) notFound();

  const today = todayISO();
  const summary = (await listCows(today)).find((c) => c.id === cow.id)!;
  const tab = TABS.some((t) => t.key === rawTab) ? (rawTab as (typeof TABS)[number]["key"]) : "health";
  const base = `/cows/${encodeURIComponent(cow.tag)}`;
  const q = `?tag=${encodeURIComponent(cow.tag)}`;

  const health = tab === "health" ? await listHealthChecks(cow.id) : [];
  const treatments = tab === "medicine" ? await listTreatments(cow.id) : [];
  const feeds = tab === "feed" ? await listFeedLogsForCow(cow) : [];
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

        <nav aria-label="Records" className="grid grid-cols-3 gap-1 rounded-xl bg-track p-1">
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

      <div className="fixed bottom-0 left-1/2 z-10 grid w-full max-w-md -translate-x-1/2 grid-cols-3 gap-2 border-t border-line bg-surface px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)]">
        <Link href={`/health/new${q}`} className="flex h-13 items-center justify-center gap-1.5 rounded-2xl bg-brand text-sm font-bold text-white">
          <PlusIcon size={16} /> Health
        </Link>
        <Link href={`/medicine/new${q}`} className="flex h-13 items-center justify-center gap-1.5 rounded-2xl bg-brand-soft text-sm font-bold text-brand-ink">
          <PlusIcon size={16} /> Medicine
        </Link>
        <Link
          href={`/feed/new?target=${encodeURIComponent(`cow:${cow.id}`)}`}
          className="flex h-13 items-center justify-center gap-1.5 rounded-2xl bg-brand-soft text-sm font-bold text-brand-ink"
        >
          <PlusIcon size={16} /> Feed
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
