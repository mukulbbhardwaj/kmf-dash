"use client";

import { useActionState } from "react";
import { type FormState } from "@/app/actions";
import { login } from "@/app/auth-actions";
import { Field, SaveBar, inputClass } from "./form";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-1 flex-col">
      <input type="hidden" name="next" value={next} />
      <div className="flex flex-col gap-5 px-5 pt-3 pb-6">
        <Field label="Email" htmlFor="email">
          <input id="email" name="email" type="email" required autoComplete="email" autoCapitalize="none" className={inputClass} />
        </Field>
        <Field label="Password" htmlFor="password">
          <input id="password" name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </Field>
      </div>
      <SaveBar label="Sign in" error={state.error} />
    </form>
  );
}
