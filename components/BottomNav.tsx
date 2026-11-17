"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { DropIcon, FeedIcon, HeartIcon, HomeIcon, ListIcon, PillIcon, PlusIcon } from "./icons";

const TABS = [
  { href: "/", label: "Home", Icon: HomeIcon },
  { href: "/cows", label: "Herd", Icon: ListIcon },
  null,
  { href: "/medicine", label: "Medicine", Icon: PillIcon },
  { href: "/feed", label: "Feed", Icon: FeedIcon },
] as const;

const ADD = [
  { href: "/milk/new", label: "Log milk", Icon: DropIcon },
  { href: "/health/new", label: "Health check", Icon: HeartIcon },
  { href: "/medicine/new", label: "Give medicine", Icon: PillIcon },
  { href: "/feed/new", label: "Log feed", Icon: FeedIcon },
  { href: "/cows/new", label: "Add cow", Icon: PlusIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-30 mx-auto max-w-md bg-ink/30" onClick={() => setOpen(false)}>
          <div
            role="menu"
            className="absolute right-4 bottom-28 left-4 grid grid-cols-2 gap-2.5 rounded-3xl bg-surface p-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {ADD.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex h-20 flex-col justify-between rounded-2xl bg-brand-soft p-3.5 text-brand-ink"
              >
                <Icon size={22} />
                <span className="text-sm font-bold">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      <nav
        aria-label="Main"
        className="fixed bottom-0 left-1/2 z-40 grid w-full max-w-md -translate-x-1/2 grid-cols-5 items-start border-t border-line bg-surface pt-2 pb-[max(env(safe-area-inset-bottom),12px)]"
      >
        {TABS.map((tab) =>
          tab ? (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={true}
              aria-current={isActive(pathname, tab.href) ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-1 text-[11px] ${
                isActive(pathname, tab.href) ? "font-bold text-brand" : "font-semibold text-muted"
              }`}
            >
              <tab.Icon size={24} />
              {tab.label}
            </Link>
          ) : (
            <span key="add" className="flex justify-center">
              <button
                type="button"
                aria-label={open ? "Close add menu" : "Add record"}
                aria-expanded={open}
                onClick={() => setOpen((o) => !o)}
                className={`-mt-5.5 flex size-14 items-center justify-center rounded-full border-4 border-ground bg-ink text-white transition-transform ${
                  open ? "rotate-45" : ""
                }`}
              >
                <PlusIcon size={24} />
              </button>
            </span>
          ),
        )}
      </nav>
    </>
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
