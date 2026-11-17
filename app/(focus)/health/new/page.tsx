import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { HealthForm } from "@/components/HealthForm";
import { Loading, PageHeader } from "@/components/ui";
import { listCows } from "@/lib/data";
import { nowTime, todayISO } from "@/lib/dates";
import { cowOptions, findTagged } from "@/lib/options";

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
  await requireUser();
  const today = todayISO();
  const cows = cowOptions(await listCows(today));
  const initial = findTagged(cows, tag);

  return (
    <>
      <PageHeader title="Health check" close={initial ? `/cows/${encodeURIComponent(initial.tag)}` : "/"} />
      <HealthForm cows={cows} initialCowId={initial?.id ?? null} today={today} now={nowTime()} />
    </>
  );
}
