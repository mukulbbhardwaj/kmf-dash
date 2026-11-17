import type { Metadata } from "next";
import { Suspense } from "react";
import { MedicineForm } from "@/components/MedicineForm";
import { Loading, PageHeader } from "@/components/ui";
import { loadFormOptions } from "@/lib/loaders";
import { findTagged } from "@/lib/options";

export const metadata: Metadata = { title: "Give medicine" };

export default function NewMedicinePage({ searchParams }: PageProps<"/medicine/new">) {
  return (
    <Suspense fallback={<Loading />}>
      <NewMedicine searchParams={searchParams} />
    </Suspense>
  );
}

async function NewMedicine({ searchParams }: Pick<PageProps<"/medicine/new">, "searchParams">) {
  const { tag } = await searchParams;
  const { today, cows, recentMedicines, presets } = await loadFormOptions();
  const initial = findTagged(cows, tag);

  return (
    <>
      <PageHeader title="Give medicine" close={initial ? `/cows/${encodeURIComponent(initial.tag)}` : "/medicine"} />
      <MedicineForm
        cows={cows}
        initialCowIds={initial ? [initial.id] : []}
        recent={recentMedicines}
        presets={presets}
        today={today}
      />
    </>
  );
}
