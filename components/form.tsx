"use client";

import { type ReactNode, useId, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { CloseIcon, MinusIcon, PlusIcon, SearchIcon } from "./icons";

export type CowOption = { id: number; tag: string; name: string | null; groupName: string | null };

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  const Tag = htmlFor ? "label" : "div";
  return (
    <div className="flex flex-col gap-2">
      <Tag {...(htmlFor ? { htmlFor } : {})} className="text-[13px] font-bold text-subtle">
        {label}
        {hint && <span className="font-medium text-muted"> · {hint}</span>}
      </Tag>
      {children}
    </div>
  );
}

export const inputClass =
  "h-13 w-full rounded-2xl border border-line bg-surface px-3.5 text-base text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

// ---------- Stepper ----------

export function Stepper({
  name,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  unit,
  decimals = 0,
  label,
  size = "md",
  start,
}: {
  name?: string;
  value: number | null;
  onChange: (v: number | null) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  decimals?: number;
  label: string;
  size?: "md" | "sm";
  /** Value the first +/− tap jumps to when empty. */
  start?: number;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const round = (v: number) => Number(Math.min(max, Math.max(min, v)).toFixed(decimals));
  const bump = (dir: 1 | -1) => {
    setDraft(null);
    onChange(value == null ? round(start ?? (dir === 1 ? min + step : min)) : round(value + dir * step));
  };
  const shown = value == null ? "" : String(Number(value.toFixed(decimals)));
  const btn = size === "sm" ? "size-11 rounded-[10px]" : "size-12 rounded-xl";

  return (
    <div className={`flex items-center justify-between gap-1 rounded-2xl border border-line bg-surface ${size === "sm" ? "p-1" : "h-16 px-2"}`}>
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <button type="button" aria-label={`Less ${label}`} onClick={() => bump(-1)} className={`${btn} flex shrink-0 items-center justify-center bg-chip active:bg-track`}>
        <MinusIcon size={20} />
      </button>
      <label className="flex min-w-0 flex-1 items-baseline justify-center gap-1">
        <span className="sr-only">{label}</span>
        <input
          inputMode="decimal"
          value={draft ?? shown}
          placeholder="–"
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = Number(e.target.value.replace(",", "."));
            onChange(e.target.value.trim() === "" || !Number.isFinite(n) ? null : n);
          }}
          onBlur={() => {
            setDraft(null);
            if (value != null) onChange(round(value));
          }}
          className={`w-full min-w-0 bg-transparent text-right font-display font-extrabold outline-none ${size === "sm" ? "text-[17px]" : "text-[24px]"}`}
          style={{ maxWidth: `${Math.max(2, (draft ?? (shown || "–")).length) + 0.5}ch` }}
        />
        {unit && <span className="text-sm font-semibold text-muted">{unit}</span>}
      </label>
      <button type="button" aria-label={`More ${label}`} onClick={() => bump(1)} className={`${btn} flex shrink-0 items-center justify-center bg-chip active:bg-track`}>
        <PlusIcon size={20} />
      </button>
    </div>
  );
}

// ---------- Chips ----------

export function Chip({
  selected,
  onClick,
  children,
  variant = "pill",
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  variant?: "pill" | "box";
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-11 px-4 text-sm font-semibold whitespace-nowrap transition-colors ${variant === "pill" ? "rounded-full" : "rounded-xl"} ${
        selected ? "bg-ink text-white" : "border border-line bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  label,
}: {
  name?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 rounded-xl bg-track p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {name && <input type="hidden" name={name} value={value} />}
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-10 rounded-[9px] text-sm ${value === o.value ? "bg-surface font-bold text-ink shadow-sm" : "font-semibold text-subtle"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Cow picker ----------

export function CowPicker({
  cows,
  selected,
  onChange,
  multiple = false,
  name = "cow_id",
}: {
  cows: CowOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
  multiple?: boolean;
  name?: string;
}) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const listId = useId();
  const chosen = selected.map((id) => cows.find((c) => c.id === id)).filter((c): c is CowOption => !!c);
  const showInput = multiple || chosen.length === 0;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return cows
      .filter((c) => !selected.includes(c.id))
      .filter((c) => c.tag.toLowerCase().startsWith(q) || c.name?.toLowerCase().includes(q))
      .sort((a, b) => Number(b.tag.toLowerCase() === q) - Number(a.tag.toLowerCase() === q))
      .slice(0, 6);
  }, [cows, query, selected]);

  const pick = (c: CowOption) => {
    onChange(multiple ? [...selected, c.id] : [c.id]);
    setQuery("");
  };

  return (
    <div className="flex flex-col gap-2">
      {selected.map((id) => (
        <input key={id} type="hidden" name={name} value={id} />
      ))}
      {chosen.map((c) => (
        <div key={c.id} className="flex h-15 items-center gap-3 rounded-2xl border-[1.5px] border-brand bg-surface px-2">
          <span className="flex h-11 items-center rounded-[10px] bg-tag px-3 font-display text-lg font-extrabold">{c.tag}</span>
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
            {c.name ?? "No name"}
            {c.groupName && <span className="font-medium text-muted"> · {c.groupName}</span>}
          </span>
          <button
            type="button"
            aria-label={`Remove ${c.tag}`}
            onClick={() => onChange(selected.filter((id) => id !== c.id))}
            className="flex size-11 items-center justify-center text-muted"
          >
            <CloseIcon size={18} />
          </button>
        </div>
      ))}
      {showInput && (
        <div className="relative">
          <label className="flex h-14 items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
            <SearchIcon size={20} className="text-muted" />
            <span className="sr-only">Cow tag number</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (matches[0]) pick(matches[0]);
                }
              }}
              placeholder={chosen.length ? "Add another tag #" : "Type tag number"}
              autoComplete="off"
              aria-controls={listId}
              className="min-w-0 flex-1 bg-transparent text-[17px] outline-none"
            />
          </label>
          {focused && query.trim() && (
            <ul id={listId} className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
              {matches.length === 0 && <li className="px-4 py-3 text-sm text-muted">No cow with tag “{query}”</li>}
              {matches.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(c)}
                    className="flex w-full items-center gap-3 border-b border-divider px-3 py-2.5 text-left last:border-0 active:bg-chip"
                  >
                    <span className="flex h-9 min-w-14 items-center justify-center rounded-lg bg-chip font-display font-extrabold">{c.tag}</span>
                    <span className="text-sm font-semibold">{c.name ?? "No name"}</span>
                    {c.groupName && <span className="text-xs text-muted">{c.groupName}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Submit ----------

export function SaveBar({ label, error }: { label: string; error?: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="sticky bottom-0 z-10 mt-auto flex flex-col gap-2 bg-ground px-5 pt-3 pb-[max(env(safe-area-inset-bottom),20px)]">
      {error && (
        <p role="alert" className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm font-semibold text-bad">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-14 w-full rounded-2xl bg-brand text-[17px] font-bold text-white active:bg-brand-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}
