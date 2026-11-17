import type { Metadata } from "next";
import { Suspense } from "react";
import { MilkForm } from "@/components/MilkForm";
import { Loading, PageHeader } from "@/components/ui";
import { loadMilkEntry } from "@/lib/loaders";

export const metadata: Metadata = { title: "Log milk" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function NewMilkPage({ searchParams }: PageProps<"/milk/new">) {
  return (
    <>
      <PageHeader title="Log milk" close="/milk" />
      <Suspense fallback={<Loading />}>
        <NewMilk searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function NewMilk({ searchParams }: Pick<PageProps<"/milk/new">, "searchParams">) {
  const { date, session } = await searchParams;
  const entry = await loadMilkEntry(
    typeof date === "string" && DATE_RE.test(date) ? date : null,
    session === "morning" || session === "evening" ? session : null,
  );
  // Key by milking so switching date/session starts from that milking's saved values.
  return <MilkForm key={`${entry.date}-${entry.session}`} {...entry} />;
}
