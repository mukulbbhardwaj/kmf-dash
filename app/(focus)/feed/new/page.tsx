import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { FeedForm } from "@/components/FeedForm";
import { Loading, PageHeader } from "@/components/ui";
import { listCows, listGroups, listLastFeedItems } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { cowOptions } from "@/lib/options";

export const metadata: Metadata = { title: "Log feed" };

export default function NewFeedPage({ searchParams }: PageProps<"/feed/new">) {
  return (
    <>
      <PageHeader title="Log feed" close="/feed" />
      <Suspense fallback={<Loading />}>
        <NewFeed searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewFeed({ searchParams }: Pick<PageProps<"/feed/new">, "searchParams">) {
  const { target, session } = await searchParams;
  await requireUser();
  const today = todayISO();
  const cows = cowOptions(await listCows(today));
  const groups = await listGroups();

  const validTarget =
    typeof target === "string" &&
    ((target.startsWith("group:") && groups.some((g) => `group:${g.name}` === target)) ||
      (target.startsWith("cow:") && cows.some((c) => `cow:${c.id}` === target)))
      ? target
      : null;

  return (
    <FeedForm
      groups={groups}
      cows={cows}
      lastItems={await listLastFeedItems()}
      initialTarget={validTarget}
      initialSession={session === "morning" || session === "evening" ? session : new Date().getHours() < 12 ? "morning" : "evening"}
      today={today}
    />
  );
}
