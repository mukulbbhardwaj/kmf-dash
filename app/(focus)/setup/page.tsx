import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";
import { SetupForm } from "@/components/AuthForms";
import { Loading } from "@/components/ui";
import { countUsers } from "@/lib/auth";

export const metadata: Metadata = { title: "Set up" };

export default function SetupPage() {
  return (
    <>
      <header className="px-5 pt-[max(env(safe-area-inset-top),48px)] pb-4">
        <h1 className="font-display text-[28px] font-extrabold tracking-tight">Welcome</h1>
        <p className="text-sm text-muted">First-time setup</p>
      </header>
      <Suspense fallback={<Loading />}>
        <Setup />
      </Suspense>
    </>
  );
}

async function Setup() {
  await connection();
  if ((await countUsers()) > 0) redirect("/login");
  if (process.env.NODE_ENV === "production" && !process.env.SETUP_CODE) {
    return (
      <p className="mx-5 rounded-2xl bg-warn-soft px-3.5 py-3 text-sm text-warn">
        Set a <code>SETUP_CODE</code> environment variable on the server, redeploy, then reload this page.
      </p>
    );
  }
  return <SetupForm needsCode={!!process.env.SETUP_CODE} />;
}
