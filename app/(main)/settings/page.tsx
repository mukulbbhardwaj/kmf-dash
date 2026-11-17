import type { Metadata } from "next";
import { Suspense } from "react";
import { removeUser } from "@/app/auth-actions";
import { AddUserForm, ChangePasswordForm, ResetPasswordForm } from "@/components/SettingsForms";
import { SignOutButton } from "@/components/SignOutButton";
import { Card, Loading, Pill, SectionTitle } from "@/components/ui";
import { listUsers, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-5 px-5 pt-[max(env(safe-area-inset-top),24px)]">
      <h1 className="pt-4 font-display text-[26px] font-extrabold tracking-tight">Settings</h1>
      <Suspense fallback={<Loading />}>
        <Settings />
      </Suspense>
    </div>
  );
}

async function Settings() {
  const user = await requireUser();
  const users = user.role === "admin" ? await listUsers() : [];

  return (
    <>
      <Card className="flex items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-bold">{user.name}</span>
          <span className="text-sm text-muted">
            @{user.username} · {user.role === "admin" ? "Admin" : "Worker"}
          </span>
        </div>
        <SignOutButton />
      </Card>

      {user.role === "admin" && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle aside={users.length}>People</SectionTitle>
          <Card className="flex flex-col">
            {users.map((u) => (
              <details key={u.id} className="group border-b border-divider px-4 py-3 last:border-0">
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-semibold">
                      {u.name} {u.id === user.id && <span className="font-normal text-muted">(you)</span>}
                    </span>
                    <span className="text-xs text-muted">@{u.username}</span>
                  </span>
                  <Pill tone={u.role === "admin" ? "info" : "neutral"}>{u.role === "admin" ? "Admin" : "Worker"}</Pill>
                </summary>
                {u.id !== user.id && (
                  <div className="flex flex-col gap-2">
                    <ResetPasswordForm userId={u.id} name={u.name} />
                    <form action={removeUser}>
                      <input type="hidden" name="id" value={u.id} />
                      <button type="submit" className="h-10 text-sm font-bold text-bad">
                        Remove {u.name}
                      </button>
                    </form>
                  </div>
                )}
              </details>
            ))}
          </Card>
        </section>
      )}

      {user.role === "admin" && (
        <section className="flex flex-col gap-2.5">
          <SectionTitle>Add a person</SectionTitle>
          <Card className="p-4">
            <AddUserForm />
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <SectionTitle>Change your password</SectionTitle>
        <Card className="p-4">
          <ChangePasswordForm />
        </Card>
      </section>
    </>
  );
}
