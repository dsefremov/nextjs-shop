"use client";

import Link from "next/link";
import { useActionState } from "react";
import { type AuthState, registerAction } from "@/app/actions/auth";
import { errorProps, Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(registerAction, { email: "", name: "", errors: {} });
  const { errors } = state;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {errors.form ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {errors.form}
        </p>
      ) : null}
      <Field id="name" label="Имя и фамилия" error={errors.name}>
        <Input id="name" name="name" autoComplete="name" defaultValue={state.name} required {...errorProps("name", errors.name)} />
      </Field>
      <Field id="email" label="Эл. почта" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state.email} required {...errorProps("email", errors.email)} />
      </Field>
      <Field id="password" label="Пароль" hint=" (не короче 8 символов)" error={errors.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" required {...errorProps("password", errors.password)} />
      </Field>
      <Field id="password2" label="Пароль ещё раз" error={errors.password2}>
        <Input id="password2" name="password2" type="password" autoComplete="new-password" required {...errorProps("password2", errors.password2)} />
      </Field>
      <SubmitButton className="h-9 w-full">Зарегистрироваться</SubmitButton>
      <p className="text-center text-sm text-neutral-500">
        Уже есть аккаунт?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-neutral-900 underline">
          Войдите
        </Link>
      </p>
    </form>
  );
}
