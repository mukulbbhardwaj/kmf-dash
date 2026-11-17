"use client";

import { useTransition } from "react";
import { logout } from "@/app/auth-actions";

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await logout();
          // Full reload: drops every cached signed-in page from the client router.
          window.location.replace("/login");
        })
      }
      className="h-11 rounded-xl border border-line px-4 text-sm font-bold disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
