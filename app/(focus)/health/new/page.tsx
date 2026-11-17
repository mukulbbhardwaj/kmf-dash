import type { Metadata } from "next";
import { Suspense } from "react";
import { HealthForm } from "@/components/HealthForm";
import { Loading, PageHeader } from "@/components/ui";
import { loadFormOptions } from "@/lib/loaders";
import { findTagged } from "@/lib/options";

export const metadata: Metadata = { title: "Health check" };

export default function NewHealthPage({ searchParams }: PageProps<"/health/new">) {
  return (
    <Suspense fallback={<Loading />}>
      <NewHealth searchParams={searchParams} />
    </Suspense>
  );
}

async function NewHealth({ searchParams }: Pick<PageProps<"/health/new">, "searchParams">) {
  const { tag } = await searchParams;
  const { today, now, cows } = await loadFormOptions();
  const initial = findTagged(cows, tag);

  return (
    <>
      <PageHeader title="Health check" close={initial ? `/cows/${encodeURIComponent(initial.tag)}` : "/"} />
      <HealthForm cows={cows} initialCowId={initial?.id ?? null} today={today} now={now} />
    </>
  );
}
