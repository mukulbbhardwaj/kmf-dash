import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="font-display text-[26px] font-extrabold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted">This page doesn&apos;t exist, or the cow was removed.</p>
      <Link href="/" className="flex h-12 items-center rounded-2xl bg-brand px-5 font-bold text-white">
        Go to Home
      </Link>
    </main>
  );
}
