import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/AuthForms";
import { Loading } from "@/components/ui";
import { countUsers, getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <header className="px-5 pt-[max(env(safe-area-inset-top),48px)] pb-4">
        <h1 className="font-display text-[28px] font-extrabold tracking-tight">Milk Farm</h1>
        <p className="text-sm text-muted">Sign in to continue</p>
      </header>
      <Suspense fallback={<Loading />}>
        <Login searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Login({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect("/");
  if ((await countUsers()) === 0) redirect("/setup");
  return <LoginForm next={typeof next === "string" ? next : "/"} />;
}
