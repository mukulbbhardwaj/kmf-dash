import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { MedicineForm } from "@/components/MedicineForm";
import { Loading, PageHeader } from "@/components/ui";
import { listCows, listMedicinePresets, listRecentMedicines } from "@/lib/data";
import { todayISO } from "@/lib/dates";
import { cowOptions, findTagged } from "@/lib/options";

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
  await requireUser();
  const today = todayISO();
  const cows = cowOptions(await listCows(today));
  const initial = findTagged(cows, tag);

  return (
    <>
      <PageHeader title="Give medicine" close={initial ? `/cows/${encodeURIComponent(initial.tag)}` : "/medicine"} />
      <MedicineForm
        cows={cows}
        initialCowIds={initial ? [initial.id] : []}
        recent={await listRecentMedicines()}
        presets={await listMedicinePresets()}
        today={today}
      />
    </>
  );
}
