"use client";

import { useActionState } from "react";
import { changePasswordAction, type FormState, updateProfileAction } from "@/app/actions/account";
import { errorProps, Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";

function Ok({ text }: { text?: string }) {
  return text ? (
    <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
      {text}
    </p>
  ) : null;
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action] = useActionState<FormState, FormData>(updateProfileAction, { errors: {} });
  return (
    <form action={action} className="space-y-4">
      <Ok text={state.ok} />
      <Field id="profile-email" label="Эл. почта">
        <Input id="profile-email" value={email} disabled readOnly />
      </Field>
      <Field id="name" label="Имя и фамилия" error={state.errors.name}>
        <Input id="name" name="name" defaultValue={name} required {...errorProps("name", state.errors.name)} />
      </Field>
      <SubmitButton>Сохранить</SubmitButton>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePasswordAction, { errors: {} });
  const e = state.errors;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Ok text={state.ok} />
      <Field id="currentPassword" label="Текущий пароль" error={e.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" {...errorProps("currentPassword", e.currentPassword)} />
      </Field>
      <Field id="newPassword" label="Новый пароль" error={e.newPassword}>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" {...errorProps("newPassword", e.newPassword)} />
      </Field>
      <Field id="newPassword2" label="Новый пароль ещё раз" error={e.newPassword2}>
        <Input id="newPassword2" name="newPassword2" type="password" autoComplete="new-password" {...errorProps("newPassword2", e.newPassword2)} />
      </Field>
      <SubmitButton variant="outline">Сменить пароль</SubmitButton>
    </form>
  );
}
