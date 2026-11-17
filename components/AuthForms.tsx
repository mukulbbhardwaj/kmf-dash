"use client";

import { useActionState } from "react";
import { type FormState } from "@/app/actions";
import { login, setup } from "@/app/auth-actions";
import { Field, SaveBar, inputClass } from "./form";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-5 px-5 pt-3 pb-6">
        <Field label="Username" htmlFor="username">
          <input id="username" name="username" required autoComplete="username" autoCapitalize="none" className={inputClass} />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </Field>
      </div>
      <SaveBar label="Sign in" error={state.error} />
    </form>
  );
}

export function SetupForm({ needsCode }: { needsCode: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(setup, {});
  return (
    <form action={action} className="flex flex-1 flex-col">
      <div className="flex flex-col gap-5 px-5 pt-3 pb-6">
        <p className="rounded-2xl bg-brand-soft px-3.5 py-3 text-sm text-brand-ink">
          Create the owner account. You can add farm workers afterwards in Settings.
        </p>
        {needsCode && (
          <Field label="Setup code" hint="the SETUP_CODE you set on the server" htmlFor="setup_code">
            <input id="setup_code" name="setup_code" required autoComplete="off" className={inputClass} />
          </Field>
        )}
        <Field label="Your name" htmlFor="name">
          <input id="name" name="name" required autoComplete="name" className={inputClass} />
        </Field>
        <Field label="Username" hint="for signing in" htmlFor="username">
          <input id="username" name="username" required autoComplete="username" autoCapitalize="none" className={inputClass} />
        </Field>
        <Field label="Password" hint="at least 8 characters" htmlFor="password">
          <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </Field>
      </div>
      <SaveBar label="Create account" error={state.error} />
    </form>
  );
}
