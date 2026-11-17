import Link from "next/link";
import type { ReactNode } from "react";
import type { Condition, CowSummary } from "@/lib/data";
import { fmtDay } from "@/lib/dates";
import { BackIcon, CloseIcon } from "./icons";

export function TagBadge({ tag, size = "md", tone = "neutral" }: { tag: string; size?: "md" | "lg"; tone?: "neutral" | "yellow" }) {
  if (size === "lg") {
    return (
      <div className="flex h-16 min-w-21 flex-col items-center justify-center rounded-2xl border-2 border-tag-edge bg-tag px-3">
        <span className="text-[10px] font-bold tracking-widest text-[#4a3a05]">TAG</span>
        <span className="font-display text-2xl leading-none font-extrabold">{tag}</span>
      </div>
    );
  }
  return (
    <span
      className={`flex h-11 min-w-16 items-center justify-center rounded-[10px] px-2.5 font-display text-base font-extrabold tracking-wide ${
        tone === "yellow" ? "bg-tag" : "border-[1.5px] border-[#d5dad0] bg-chip"
      }`}
    >
      {tag}
    </span>
  );
}

const PILL = {
  sick: "bg-bad-soft text-bad",
  watch: "bg-warn-soft text-warn",
  hold: "bg-warn-soft text-warn",
  healthy: "bg-brand-soft text-brand-ink",
  neutral: "bg-[#edeeea] text-subtle",
  info: "bg-info-soft text-info",
} as const;

export function Pill({ tone, children }: { tone: keyof typeof PILL; children: ReactNode }) {
  return (
    <span className={`inline-flex h-6.5 items-center rounded-full px-2.5 text-xs font-bold whitespace-nowrap ${PILL[tone]}`}>
      {children}
    </span>
  );
}

export const CONDITION_LABEL: Record<Condition, string> = { healthy: "Healthy", watch: "Watch", sick: "Sick" };

/** One headline status for a cow, most urgent first. */
export function CowStatusPill({ cow }: { cow: CowSummary }) {
  if (cow.condition === "sick") return <Pill tone="sick">Sick</Pill>;
  if (cow.milkSafeFrom) return <Pill tone="hold">Milk hold</Pill>;
  if (cow.condition === "watch") return <Pill tone="watch">Watch</Pill>;
  if (cow.onTreatment) return <Pill tone="info">On medicine</Pill>;
  if (cow.stage === "dry") return <Pill tone="neutral">Dry</Pill>;
  if (cow.stage === "heifer" || cow.stage === "calf") return <Pill tone="neutral">{cow.stage === "calf" ? "Calf" : "Heifer"}</Pill>;
  return <Pill tone="healthy">Healthy</Pill>;
}

export function MilkHoldBanner({ until }: { until: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-warn-soft px-3.5 py-3 text-warn">
      <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-bold">Don&apos;t sell milk until {fmtDay(until)}</span>
        <span className="text-xs">Medicine withdrawal period</span>
      </div>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface ${className}`}>{children}</div>;
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-[15px] font-bold">{children}</h2>
      {aside && <span className="text-[13px] text-muted">{aside}</span>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-[#c9cfc3] px-4 py-6 text-center text-sm text-muted">{children}</div>;
}

export function PageHeader({ title, back, close, action }: { title: ReactNode; back?: string; close?: string; action?: ReactNode }) {
  const href = back ?? close;
  return (
    <header className="flex items-center gap-3 px-5 pt-[max(env(safe-area-inset-top),20px)] pb-2">
      {href && (
        <Link
          href={href}
          aria-label={back ? "Back" : "Close"}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-track text-ink"
        >
          {back ? <BackIcon size={20} /> : <CloseIcon size={20} />}
        </Link>
      )}
      <h1 className="flex-1 font-display text-[22px] font-extrabold tracking-tight">{title}</h1>
      {action}
    </header>
  );
}

export function Loading() {
  return (
    <div className="flex flex-col gap-3 px-5 pt-24" aria-busy="true" aria-label="Loading">
      <div className="h-14 animate-pulse rounded-2xl bg-track" />
      <div className="h-24 animate-pulse rounded-2xl bg-track" />
      <div className="h-40 animate-pulse rounded-2xl bg-track" />
    </div>
  );
}
