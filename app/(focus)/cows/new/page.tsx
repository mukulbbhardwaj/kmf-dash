import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { CowForm } from "@/components/CowForm";
import { Loading, PageHeader } from "@/components/ui";
import { listBreeds, listGroups } from "@/lib/data";

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
  await requireUser();
  return <CowForm groups={(await listGroups()).map((g) => g.name)} breeds={await listBreeds()} />;
}
