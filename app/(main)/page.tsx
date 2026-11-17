import Link from "next/link";
import { Suspense } from "react";
import { DropIcon, FeedIcon, HeartIcon, PillIcon, PlusIcon, ChevronRightIcon, UserIcon } from "@/components/icons";
import { QuickFind } from "@/components/QuickFind";
import { Card, Empty, Loading, SectionTitle } from "@/components/ui";
import { isActiveTreatment, treatmentDay } from "@/lib/data";
import { fmtDay, fmtLongDay } from "@/lib/dates";
import { loadHome } from "@/lib/loaders";

export default function HomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <Home />
    </Suspense>
  );
}

type Task = { key: string; href: string; badge: string; tone: string; title: string; detail: string };

async function Home() {
  const { user, today, hour, cows, treatments, fedToday, groups, milkToday, milkYesterday } = await loadHome();
  const milking = cows.filter((c) => c.stage === "milking").length;

  const sick = cows.filter((c) => c.condition === "sick").length;
  const onHold = cows.filter((c) => c.milkSafeFrom).length;

  const tasks: Task[] = [
    ...(milking > 0
      ? (hour < 17 ? (["morning"] as const) : (["morning", "evening"] as const))
          .filter((s) => (s === "morning" ? milkToday?.morning : milkToday?.evening) == null)
          .map((s) => ({
            key: `m${s}`,
            href: `/milk/new?session=${s}`,
            badge: "Milk",
            tone: "bg-info-soft text-info",
            title: `${s === "morning" ? "Morning" : "Evening"} milk`,
            detail: `${milking} milking cows · not logged yet`,
          }))
      : []),
    ...treatments
      .filter((t) => isActiveTreatment(t, today))
      .map((t) => ({
        key: `t${t.id}`,
        href: `/cows/${encodeURIComponent(t.cowTag)}?tab=medicine`,
        badge: t.cowTag,
        tone: "bg-bad-soft text-bad",
        title: `${t.medicine} – day ${treatmentDay(t, today)} of ${t.days}`,
        detail: [t.dose != null ? `${t.dose} ${t.unit}` : null, `${t.timesPerDay}× a day`].filter(Boolean).join(" · "),
      })),
    ...cows
      .filter((c) => c.condition === "sick" || c.condition === "watch")
      .filter((c) => !treatments.some((t) => t.cowId === c.id && isActiveTreatment(t, today)))
      .map((c) => ({
        key: `c${c.id}`,
        href: `/health/new?tag=${encodeURIComponent(c.tag)}`,
        badge: c.tag,
        tone: c.condition === "sick" ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn",
        title: c.condition === "sick" ? "Sick – no medicine logged" : "Keep watching",
        detail: `Last check ${c.lastCheck ? fmtDay(c.lastCheck) : "–"}`,
      })),
    ...groups.flatMap((g) =>
      (hour < 12 ? (["morning"] as const) : (["morning", "evening"] as const))
        .filter((s) => !fedToday.some((f) => f.groupName?.toLowerCase() === g.name.toLowerCase() && f.session === s))
        .map((s) => ({
          key: `f${g.name}${s}`,
          href: `/feed/new?target=${encodeURIComponent(`group:${g.name}`)}&session=${s}`,
          badge: g.name,
          tone: "bg-brand-soft text-brand-ink",
          title: `${s === "morning" ? "Morning" : "Evening"} feed`,
          detail: `${g.count} ${g.count === 1 ? "cow" : "cows"} · not logged yet`,
        })),
    ),
  ];

  return (
    <div className="flex flex-col gap-5 px-5 pt-[max(env(safe-area-inset-top),24px)]">
      <div className="flex items-center justify-between pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium text-muted">{fmtLongDay(today)}</span>
          <h1 className="font-display text-[26px] font-extrabold tracking-tight">Milk Farm</h1>
        </div>
        <Link
          href="/settings"
          aria-label={`Settings, signed in as ${user.email}`}
          className="flex size-11 items-center justify-center rounded-full border border-line bg-surface"
        >
          <UserIcon size={22} />
        </Link>
      </div>

      <QuickFind tags={cows.map((c) => c.tag)} />

      <div className="grid grid-cols-3 gap-2.5">
        <Link href="/cows" className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-3.5">
          <span className="font-display text-[26px] font-extrabold">{cows.length}</span>
          <span className="text-xs font-medium text-muted">Cows</span>
        </Link>
        <Link href="/cows?filter=sick" className="flex flex-col gap-1 rounded-2xl bg-bad-soft p-3.5 text-bad">
          <span className="font-display text-[26px] font-extrabold">{sick}</span>
          <span className="text-xs font-semibold">Sick</span>
        </Link>
        <Link href="/cows?filter=hold" className="flex flex-col gap-1 rounded-2xl bg-warn-soft p-3.5 text-warn">
          <span className="font-display text-[26px] font-extrabold">{onHold}</span>
          <span className="text-xs font-semibold">Milk on hold</span>
        </Link>
      </div>

      <Link href="/milk" prefetch={true} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-info-soft text-info">
          <DropIcon size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-xs text-muted">Milk today</span>
          <span className="font-display text-xl font-extrabold">
            {milkToday ? `${litres(milkToday.total)} L` : "Not logged"}
            {milkToday && milkToday.held > 0 && <span className="ml-1.5 text-xs font-semibold text-warn">{litres(milkToday.held)} L on hold</span>}
          </span>
          <span className="truncate text-xs text-muted">
            Morning {milkToday?.morning != null ? `${litres(milkToday.morning)} L` : "–"} · Evening{" "}
            {milkToday?.evening != null ? `${litres(milkToday.evening)} L` : "–"}
            {milkYesterday && ` · Yesterday ${litres(milkYesterday.total)} L`}
          </span>
        </span>
        <ChevronRightIcon size={18} className="text-muted" />
      </Link>

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Quick add</SectionTitle>
        <div className="grid grid-cols-4 gap-2">
          <Link href="/milk/new" prefetch={true} className="flex h-21 flex-col justify-between rounded-2xl bg-brand p-3 text-white">
            <DropIcon size={22} />
            <span className="text-[13px] font-semibold">Milk</span>
          </Link>
          <Link href="/health/new" prefetch={true} className="flex h-21 flex-col justify-between rounded-2xl border border-line bg-surface p-3">
            <HeartIcon size={22} className="text-brand" />
            <span className="text-[13px] font-semibold">Health</span>
          </Link>
          <Link href="/medicine/new" prefetch={true} className="flex h-21 flex-col justify-between rounded-2xl border border-line bg-surface p-3">
            <PillIcon size={22} className="text-brand" />
            <span className="text-[13px] font-semibold">Medicine</span>
          </Link>
          <Link href="/feed/new" prefetch={true} className="flex h-21 flex-col justify-between rounded-2xl border border-line bg-surface p-3">
            <FeedIcon size={22} className="text-brand" />
            <span className="text-[13px] font-semibold">Feed</span>
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionTitle aside={tasks.length ? `${tasks.length} ${tasks.length === 1 ? "task" : "tasks"}` : undefined}>Due today</SectionTitle>
        {cows.length === 0 ? (
          <Empty>
            <p className="mb-3">No cows yet. Add your herd to start tracking.</p>
            <Link href="/cows/new" className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-brand px-4 font-bold text-white">
              <PlusIcon size={16} /> Add first cow
            </Link>
          </Empty>
        ) : tasks.length === 0 ? (
          <Empty>All done for now.</Empty>
        ) : (
          <Card className="flex flex-col">
            {tasks.map((t) => (
              <Link key={t.key} href={t.href} className="flex items-center gap-3 border-b border-divider px-3.5 py-3 last:border-0">
                <span className={`flex h-8.5 min-w-14.5 items-center justify-center rounded-[10px] px-2 text-[13px] font-bold ${t.tone}`}>{t.badge}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-semibold">{t.title}</span>
                  <span className="truncate text-xs text-muted">{t.detail}</span>
                </span>
                <ChevronRightIcon size={18} className="text-muted" />
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

function litres(n: number) {
  return String(Math.round(n * 10) / 10);
}
