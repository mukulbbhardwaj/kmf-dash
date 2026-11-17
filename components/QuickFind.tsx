"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SearchIcon } from "./icons";

/** Type a tag and press Go: an exact tag opens the cow, anything else searches the herd. */
export function QuickFind({ tags }: { tags: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const query = q.trim();
        if (!query) return;
        const exact = tags.find((t) => t.toLowerCase() === query.toLowerCase());
        router.push(exact ? `/cows/${encodeURIComponent(exact)}` : `/cows?q=${encodeURIComponent(query)}`);
      }}
      className="flex h-14 items-center gap-2.5 rounded-2xl border-[1.5px] border-brand bg-surface pr-2 pl-4"
    >
      <SearchIcon size={20} className="shrink-0 text-muted" />
      <label className="sr-only" htmlFor="quick-find">
        Find cow by tag number
      </label>
      <input
        id="quick-find"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Enter tag number"
        autoComplete="off"
        enterKeyHint="go"
        className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
      />
      <button type="submit" className="h-10 rounded-xl bg-brand-soft px-4 text-sm font-bold text-brand-ink">
        Go
      </button>
    </form>
  );
}
