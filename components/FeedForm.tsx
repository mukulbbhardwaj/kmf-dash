"use client";

import { useActionState, useState } from "react";
import { saveFeedLog, type FormState } from "@/app/actions";
import type { FeedItem, Session } from "@/lib/data";
import { CloseIcon, PlusIcon } from "./icons";
import { Chip, CowPicker, type CowOption, Field, SaveBar, Segmented, Stepper, inputClass } from "./form";

const DEFAULT_ITEMS: FeedItem[] = [
  { name: "Green fodder", qty: 0, unit: "kg" },
  { name: "Dry straw", qty: 0, unit: "kg" },
  { name: "Concentrate", qty: 0, unit: "kg" },
  { name: "Mineral mix", qty: 0, unit: "kg" },
];

type Group = { name: string; count: number };

export function FeedForm({
  groups,
  cows,
  lastItems,
  initialTarget,
  initialSession,
  today,
}: {
  groups: Group[];
  cows: CowOption[];
  lastItems: Record<string, FeedItem[]>;
  initialTarget: string | null;
  initialSession: Session;
  today: string;
}) {
  const [state, action] = useActionState<FormState, FormData>(saveFeedLog, {});
  const [session, setSession] = useState<Session>(initialSession);
  const [target, setTarget] = useState<string | null>(initialTarget ?? (groups[0] ? `group:${groups[0].name}` : null));
  const [cowMode, setCowMode] = useState(initialTarget?.startsWith("cow:") ?? groups.length === 0);
  const [mode, setMode] = useState<"total" | "per">("total");
  const [items, setItems] = useState<FeedItem[]>(() => prefill(lastItems, target, session));
  const [newItem, setNewItem] = useState("");

  const headCount = target?.startsWith("group:") ? groups.find((g) => `group:${g.name}` === target)?.count ?? 1 : 1;
  const prev = target ? lastItems[`${target}|${session}`] ?? lastItems[target] : undefined;

  const choose = (t: string | null, s = session) => {
    setTarget(t);
    setItems(prefill(lastItems, t, s));
  };
  const setQty = (i: number, qty: number | null) =>
    setItems((cur) => cur.map((it, j) => (j === i ? { ...it, qty: qty == null ? 0 : mode === "per" ? round(qty * headCount) : qty } : it)));

  const total = items.reduce((sum, i) => sum + (i.unit === "kg" ? i.qty : 0), 0);

  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="target" value={target ?? ""} />
      <input type="hidden" name="items" value={JSON.stringify(items.filter((i) => i.qty > 0))} />

      <div className="flex flex-col gap-5 px-5 pt-3 pb-6">
        <Segmented
          name="session"
          label="When"
          value={session}
          onChange={(s) => {
            setSession(s);
            setItems(prefill(lastItems, target, s));
          }}
          options={[
            { value: "morning", label: "Morning" },
            { value: "evening", label: "Evening" },
          ]}
        />

        <Field label="Who">
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <Chip
                key={g.name}
                selected={!cowMode && target === `group:${g.name}`}
                onClick={() => {
                  setCowMode(false);
                  choose(`group:${g.name}`);
                }}
              >
                {g.name} · {g.count}
              </Chip>
            ))}
            <button
              type="button"
              aria-pressed={cowMode}
              onClick={() => {
                setCowMode(true);
                choose(null);
              }}
              className={`h-11 rounded-full px-4 text-sm font-semibold ${cowMode ? "bg-ink text-white" : "border border-dashed border-[#b9c0b3]"}`}
            >
              One cow by tag
            </button>
          </div>
          {cowMode && (
            <CowPicker
              cows={cows}
              name="_cow"
              selected={target?.startsWith("cow:") ? [Number(target.slice(4))] : []}
              onChange={(ids) => choose(ids[0] ? `cow:${ids[0]}` : null)}
            />
          )}
        </Field>

        <Field label="What was given">
          <div className="flex items-center justify-between gap-2">
            {headCount > 1 ? (
              <div className="w-48">
                <Segmented
                  label="Enter amounts as"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "total", label: "Total" },
                    { value: "per", label: "Per cow" },
                  ]}
                />
              </div>
            ) : (
              <span />
            )}
            {prev && (
              <button type="button" onClick={() => setItems(prev.map((i) => ({ ...i })))} className="h-9 px-1 text-[13px] font-bold text-brand">
                Same as last time
              </button>
            )}
          </div>

          <div className="flex flex-col rounded-2xl border border-line bg-surface">
            {items.map((item, i) => (
              <div key={item.name} className="flex items-center gap-2 border-b border-divider py-2.5 pr-2.5 pl-3.5 last:border-0">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold">{item.name}</span>
                  <span className="text-xs text-muted">
                    {headCount > 1 && item.qty > 0
                      ? mode === "total"
                        ? `${fmt(item.qty / headCount)} ${item.unit} per cow`
                        : `${fmt(item.qty)} ${item.unit} total`
                      : item.unit}
                  </span>
                </div>
                <div className="w-44">
                  <Stepper
                    size="sm"
                    label={item.name}
                    value={mode === "per" && headCount > 1 ? round(item.qty / headCount) : item.qty}
                    onChange={(v) => setQty(i, v)}
                    step={stepFor(item, mode === "per" ? 1 : headCount)}
                    min={0}
                    max={100000}
                    decimals={2}
                  />
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => setItems((cur) => cur.filter((_, j) => j !== i))}
                  className="flex size-9 shrink-0 items-center justify-center text-muted"
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <label className="sr-only" htmlFor="new-item">
              New feed item
            </label>
            <input
              id="new-item"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder="Add feed item (e.g. Silage)"
              className={`${inputClass} h-11 flex-1`}
            />
            <button type="button" onClick={addItem} aria-label="Add feed item" className="flex size-11 items-center justify-center rounded-xl bg-brand-soft text-brand-ink">
              <PlusIcon size={18} />
            </button>
          </div>
        </Field>

        {total > 0 && (
          <div className="flex items-center justify-between rounded-2xl bg-brand-soft px-3.5 py-3 text-brand-ink">
            <span className="text-[13px] font-semibold">Total this feed</span>
            <span className="text-sm font-extrabold">
              {fmt(total)} kg{headCount > 1 ? ` · ${fmt(total / headCount)} kg per cow` : ""}
            </span>
          </div>
        )}

        <Field label="Date" htmlFor="date">
          <input id="date" name="date" type="date" defaultValue={today} max={today} className={inputClass} />
        </Field>
      </div>
      <SaveBar label={`Save ${session} feed`} error={state.error} />
    </form>
  );

  function addItem() {
    const name = newItem.trim();
    if (!name || items.some((i) => i.name.toLowerCase() === name.toLowerCase())) return;
    setItems((cur) => [...cur, { name, qty: 0, unit: "kg" }]);
    setNewItem("");
  }
}

function prefill(last: Record<string, FeedItem[]>, target: string | null, session: Session): FeedItem[] {
  const prev = target ? last[`${target}|${session}`] ?? last[target] : undefined;
  if (!prev) return DEFAULT_ITEMS.map((i) => ({ ...i }));
  // Keep the usual items listed even when last time skipped some.
  const names = new Set(prev.map((i) => i.name.toLowerCase()));
  return [...prev.map((i) => ({ ...i })), ...DEFAULT_ITEMS.filter((i) => !names.has(i.name.toLowerCase())).map((i) => ({ ...i }))];
}

function stepFor(item: FeedItem, multiplier: number) {
  const base = /mineral|salt/i.test(item.name) ? 0.05 : /concentrate|grain|cake/i.test(item.name) ? 0.5 : 1;
  return round(base * multiplier);
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function fmt(n: number) {
  return String(round(n));
}
