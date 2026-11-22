"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type AuthState, loginAction } from "@/app/actions/auth";
import { Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(loginAction, { email: "", errors: {} });
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.errors.form ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" data-testid="login-error">
          {state.errors.form}
        </p>
      ) : null}
      <Field id="email" label="Эл. почта">
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required />
      </Field>
      <Field id="password" label="Пароль">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="h-9 w-full">Войти</SubmitButton>
      <p className="text-center text-sm text-neutral-500">
        Нет аккаунта?{" "}
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="text-neutral-900 underline">
          Зарегистрируйтесь
        </Link>
      </p>
    </form>
  );
}
