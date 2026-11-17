import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { HerdList } from "@/components/HerdList";
import { PlusIcon } from "@/components/icons";
import { Loading } from "@/components/ui";
import { loadHerd } from "@/lib/loaders";

export const metadata: Metadata = { title: "Herd" };

export default function HerdPage({ searchParams }: PageProps<"/cows">) {
  return (
    <Suspense fallback={<Loading />}>
      <Herd searchParams={searchParams} />
    </Suspense>
  );
}

async function Herd({ searchParams }: Pick<PageProps<"/cows">, "searchParams">) {
  const { q, filter } = await searchParams;
  const cows = await loadHerd();

  return (
    <div className="flex flex-col gap-3.5 px-5 pt-[max(env(safe-area-inset-top),24px)]">
      <div className="flex items-center justify-between pt-4">
        <h1 className="font-display text-[26px] font-extrabold tracking-tight">
          Herd <span className="text-lg font-semibold text-muted">{cows.length}</span>
        </h1>
        <Link href="/cows/new" className="flex h-10 items-center gap-1.5 rounded-full bg-ink px-3.5 text-sm font-semibold text-white">
          <PlusIcon size={16} /> Add cow
        </Link>
      </div>
      <HerdList cows={cows} initialQuery={typeof q === "string" ? q : ""} initialFilter={typeof filter === "string" ? filter : "all"} />
    </div>
  );
}
