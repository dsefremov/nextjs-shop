"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/app/actions/admin";
import { errorProps, Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export interface CategoryFormValues {
  name: string;
  slug: string;
  description: string;
  position: string;
  image: string | null;
}

export function CategoryForm({
  action,
  initial,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  initial: CategoryFormValues;
}) {
  const [state, formAction] = useActionState(action, { errors: {} });
  const v = { ...initial, ...(state.values ?? {}) } as CategoryFormValues;
  const e = state.errors;
  return (
    <form key={JSON.stringify(state.values ?? null)} action={formAction} className="space-y-5" noValidate>
      <div className="grid gap-4 md:grid-cols-3">
        <Field id="name" label="Название" error={e.name}>
          <Input id="name" name="name" defaultValue={v.name} required maxLength={120} {...errorProps("name", e.name)} />
        </Field>
        <Field id="slug" label="Адрес (slug)" hint=" — пусто: из названия" error={e.slug}>
          <Input id="slug" name="slug" defaultValue={v.slug} maxLength={140} {...errorProps("slug", e.slug)} />
        </Field>
        <Field id="position" label="Порядок" error={e.position}>
          <Input id="position" name="position" type="number" min={0} defaultValue={v.position} {...errorProps("position", e.position)} />
        </Field>
      </div>
      <Field id="description" label="Описание" error={e.description}>
        <Textarea id="description" name="description" rows={3} defaultValue={v.description} {...errorProps("description", e.description)} />
      </Field>
      <Field id="image" label="Картинка" hint=" — PNG, JPEG или WebP до 5 МБ" error={e.image}>
        <div className="flex items-center gap-3">
          {v.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- превью загруженного файла
            <img src={`/media/${v.image}`} alt="Текущая картинка" width={56} height={56} className="size-14 rounded-md border object-cover" />
          ) : null}
          <Input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" className="max-w-sm" {...errorProps("image", e.image)} />
        </div>
      </Field>
      <div className="border-t border-neutral-100 pt-4">
        <SubmitButton>Сохранить</SubmitButton>
      </div>
    </form>
  );
}
