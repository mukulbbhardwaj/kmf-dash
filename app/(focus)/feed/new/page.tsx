import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedForm } from "@/components/FeedForm";
import { Loading, PageHeader } from "@/components/ui";
import { loadFormOptions } from "@/lib/loaders";

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
  const { today, hour, cows, groups, lastFeedItems } = await loadFormOptions();

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
      lastItems={lastFeedItems}
      initialTarget={validTarget}
      initialSession={session === "morning" || session === "evening" ? session : hour < 12 ? "morning" : "evening"}
      today={today}
    />
  );
}
