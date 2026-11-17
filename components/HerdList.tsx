"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { CowSummary } from "@/lib/data";
import { SearchIcon } from "./icons";
import { CowStatusPill, Empty, TagBadge } from "./ui";

type Row = CowSummary & { age: string | null };

const FILTERS: { key: string; label: string; test: (c: Row) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "milking", label: "Milking", test: (c) => c.stage === "milking" },
  { key: "sick", label: "Sick", test: (c) => c.condition === "sick" || c.condition === "watch" },
  { key: "hold", label: "Milk hold", test: (c) => !!c.milkSafeFrom },
  { key: "dry", label: "Dry", test: (c) => c.stage === "dry" },
  { key: "young", label: "Heifers & calves", test: (c) => c.stage === "heifer" || c.stage === "calf" },
];

const STAGE_LABEL = { milking: "Milking", dry: "Dry", heifer: "Heifer", calf: "Calf" } as const;

export function HerdList({ cows, initialQuery, initialFilter }: { cows: Row[]; initialQuery: string; initialFilter: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState(FILTERS.some((f) => f.key === initialFilter) ? initialFilter : "all");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const test = FILTERS.find((f) => f.key === filter)!.test;
    return cows
      .filter(test)
      .filter((c) => !q || c.tag.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q) || c.groupName?.toLowerCase().includes(q));
  }, [cows, query, filter]);

  return (
    <>
      <label className="flex h-13 items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 focus-within:border-brand">
        <SearchIcon size={20} className="text-muted" />
        <span className="sr-only">Search herd</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tag #, name or group"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-base outline-none"
        />
      </label>

      <div role="group" aria-label="Filter" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {FILTERS.map((f) => {
          const count = cows.filter(f.test).length;
          const on = f.key === filter;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(f.key)}
              className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap ${on ? "bg-brand text-white" : "border border-line bg-surface"}`}
            >
              {f.label} {count}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        {shown.length === 0 && <Empty>{cows.length === 0 ? "No cows yet." : "No cows match."}</Empty>}
        {shown.map((c) => (
          <Link key={c.id} href={`/cows/${encodeURIComponent(c.tag)}`} className="flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5">
            <TagBadge tag={c.tag} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[15px] font-semibold">{c.name ?? "No name"}</span>
              <span className="truncate text-xs text-muted">{[c.breed, c.age, c.groupName ?? STAGE_LABEL[c.stage]].filter(Boolean).join(" · ")}</span>
            </span>
            <CowStatusPill cow={c} />
          </Link>
        ))}
      </div>
    </>
  );
}
