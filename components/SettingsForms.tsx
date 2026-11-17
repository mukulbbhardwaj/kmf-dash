"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { type FormState } from "@/app/actions";
import { addUser, changeOwnPassword, resetUserPassword } from "@/app/auth-actions";
import { Field, Segmented, inputClass } from "./form";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="h-12 rounded-xl bg-brand px-4 font-bold text-white disabled:opacity-60">
      {pending ? "Saving…" : label}
    </button>
  );
}

function Result({ state }: { state: FormState }) {
  if (state.error) return <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-semibold text-bad">{state.error}</p>;
  if (state.ok) return <p role="status" className="rounded-xl bg-brand-soft px-3 py-2 text-sm font-semibold text-brand-ink">{state.ok}</p>;
  return null;
}

export function ChangePasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changeOwnPassword, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Current password" htmlFor="current">
        <input id="current" name="current" type="password" required autoComplete="current-password" className={inputClass} />
      </Field>
      <Field label="New password" hint="at least 8 characters" htmlFor="new-password">
        <input id="new-password" name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      <Result state={state} />
      <Submit label="Change password" />
    </form>
  );
}

export function AddUserForm() {
  const [state, action] = useActionState<FormState, FormData>(addUser, {});
  const [role, setRole] = useState<"worker" | "admin">("worker");
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Name" htmlFor="u-name">
        <input id="u-name" name="name" required autoComplete="off" className={inputClass} />
      </Field>
      <Field label="Username" htmlFor="u-username">
        <input id="u-username" name="username" required autoComplete="off" autoCapitalize="none" className={inputClass} />
      </Field>
      <Field label="Password" hint="at least 8 characters" htmlFor="u-password">
        <input id="u-password" name="password" type="text" required minLength={8} autoComplete="off" className={inputClass} />
      </Field>
      <Field label="Role">
        <Segmented
          name="role"
          label="Role"
          value={role}
          onChange={setRole}
          options={[
            { value: "worker", label: "Worker" },
            { value: "admin", label: "Admin" },
          ]}
        />
        <span className="text-xs text-muted">Workers can add and edit records. Admins can also delete cows and manage users.</span>
      </Field>
      <Result state={state} />
      <Submit label="Add user" />
    </form>
  );
}

export function ResetPasswordForm({ userId, name }: { userId: number; name: string }) {
  const [state, action] = useActionState<FormState, FormData>(resetUserPassword, {});
  return (
    <form action={action} className="flex flex-col gap-2 pt-2">
      <input type="hidden" name="id" value={userId} />
      <label className="sr-only" htmlFor={`reset-${userId}`}>
        New password for {name}
      </label>
      <div className="flex gap-2">
        <input id={`reset-${userId}`} name="password" type="text" required minLength={8} placeholder="New password" autoComplete="off" className={`${inputClass} h-12 flex-1`} />
        <Submit label="Set" />
      </div>
      <Result state={state} />
    </form>
  );
}
