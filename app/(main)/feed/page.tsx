import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { DeleteRecordButton } from "@/components/DeleteButton";
import { PlusIcon } from "@/components/icons";
import { Card, Empty, Loading, SectionTitle } from "@/components/ui";
import { type FeedLog, listFeedLogs, listGroups } from "@/lib/data";
import { addDays, fmtRelative, todayISO } from "@/lib/dates";

export const metadata: Metadata = { title: "Feed" };

export default function FeedPage() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-[max(env(safe-area-inset-top),24px)]">
      <div className="flex items-center justify-between pt-4">
        <h1 className="font-display text-[26px] font-extrabold tracking-tight">Feed</h1>
        <Link href="/feed/new" className="flex h-10 items-center gap-1.5 rounded-full bg-ink px-3.5 text-sm font-semibold text-white">
          <PlusIcon size={16} /> Log feed
        </Link>
      </div>
      <Suspense fallback={<Loading />}>
        <FeedLists />
      </Suspense>
    </div>
  );
}

async function FeedLists() {
  await requireUser();
  const today = todayISO();
  const logs = await listFeedLogs(addDays(today, -13), today);
  const groups = await listGroups();
  const todays = logs.filter((l) => l.date === today);

  const byDay = new Map<string, FeedLog[]>();
  for (const l of logs.filter((l) => l.date !== today)) byDay.set(l.date, [...(byDay.get(l.date) ?? []), l]);

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <SectionTitle>Today</SectionTitle>
        {groups.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {(["morning", "evening"] as const).map((s) => {
              const done = groups.filter((g) => todays.some((l) => l.session === s && l.groupName?.toLowerCase() === g.name.toLowerCase()));
              const missing = groups.filter((g) => !done.includes(g));
              return (
                <div key={s} className={`flex flex-col gap-1 rounded-2xl p-3.5 ${missing.length ? "border border-line bg-surface" : "bg-brand-soft text-brand-ink"}`}>
                  <span className="text-sm font-bold">{s === "morning" ? "Morning" : "Evening"}</span>
                  <span className={`text-xs ${missing.length ? "text-muted" : ""}`}>
                    {missing.length === 0 ? "All groups fed" : `${done.length} of ${groups.length} groups logged`}
                  </span>
                  {missing.slice(0, 3).map((g) => (
                    <Link
                      key={g.name}
                      href={`/feed/new?target=${encodeURIComponent(`group:${g.name}`)}&session=${s}`}
                      className="mt-1 flex h-9 items-center gap-1 rounded-lg bg-brand-soft px-2.5 text-xs font-bold text-brand-ink"
                    >
                      <PlusIcon size={14} /> {g.name}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {todays.length === 0 ? <Empty>Nothing logged today.</Empty> : <LogList logs={todays} today={today} />}
      </section>

      {[...byDay.entries()].map(([day, list]) => (
        <section key={day} className="flex flex-col gap-2.5">
          <SectionTitle aside={`${Math.round(list.reduce((s, l) => s + kg(l), 0))} kg`}>{fmtRelative(day, today)}</SectionTitle>
          <LogList logs={list} today={today} />
        </section>
      ))}
    </>
  );
}

function kg(l: FeedLog) {
  return l.items.reduce((s, i) => s + (i.unit === "kg" ? i.qty : 0), 0);
}

function LogList({ logs, today }: { logs: FeedLog[]; today: string }) {
  return (
    <Card className="flex flex-col">
      {logs.map((l) => (
        <div key={l.id} className="flex items-start gap-3 border-b border-divider px-3.5 py-3 last:border-0">
          <span className="flex h-8.5 min-w-14.5 items-center justify-center rounded-[10px] bg-brand-soft px-2 text-[13px] font-bold text-brand-ink">
            {l.groupName ?? l.cowTag}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-sm font-semibold">
              {l.session === "morning" ? "Morning" : "Evening"} · {Math.round(kg(l) * 10) / 10} kg
              {l.headCount > 1 && <span className="font-medium text-muted"> · {l.headCount} cows</span>}
            </span>
            <span className="text-xs leading-snug text-muted">{l.items.map((i) => `${i.name} ${Math.round(i.qty * 1000) / 1000} ${i.unit}`).join(", ")}</span>
          </span>
          <DeleteRecordButton kind="feed" id={l.id} back="/feed" label={`feed log from ${fmtRelative(l.date, today).toLowerCase()}`} />
        </div>
      ))}
    </Card>
  );
}
