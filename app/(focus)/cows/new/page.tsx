import type { Metadata } from "next";
import { Suspense } from "react";
import { CowForm } from "@/components/CowForm";
import { Loading, PageHeader } from "@/components/ui";
import { loadFormOptions } from "@/lib/loaders";

export const metadata: Metadata = { title: "Add cow" };

export default function NewCowPage() {
  return (
    <>
      <PageHeader title="Add cow" close="/cows" />
      <Suspense fallback={<Loading />}>
        <NewCow />
      </Suspense>
    </>
  );
}

async function NewCow() {
  const { groups, breeds } = await loadFormOptions();
  return <CowForm groups={groups.map((g) => g.name)} breeds={breeds} />;
}
