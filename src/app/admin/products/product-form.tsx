"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/app/actions/admin";
import { errorProps, Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export interface ProductFormValues {
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  price: string;
  stock: string;
  isActive: boolean;
  image: string | null;
}

export function ProductForm({
  action,
  initial,
  categories,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  initial: ProductFormValues;
  categories: { id: number; name: string }[];
}) {
  const [state, formAction] = useActionState(action, { errors: {} });
  const v = { ...initial, ...(state.values ?? {}) } as ProductFormValues;
  const e = state.errors;
  // key: после ошибки форма пересоздаётся с введёнными значениями (defaultValue).
  const key = JSON.stringify(state.values ?? null);
  return (
    <form key={key} action={formAction} className="space-y-5" noValidate>
      {Object.keys(e).length > 0 ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Исправьте ошибки в форме.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="name" label="Название" error={e.name}>
          <Input id="name" name="name" defaultValue={v.name} required maxLength={200} {...errorProps("name", e.name)} />
        </Field>
        <Field id="slug" label="Адрес (slug)" hint=" — пусто: из названия" error={e.slug}>
          <Input id="slug" name="slug" defaultValue={v.slug} maxLength={220} {...errorProps("slug", e.slug)} />
        </Field>
        <Field id="categoryId" label="Категория" error={e.categoryId}>
          <NativeSelect id="categoryId" name="categoryId" defaultValue={v.categoryId} className="w-full" {...errorProps("categoryId", e.categoryId)}>
            <NativeSelectOption value="">— выберите —</NativeSelectOption>
            {categories.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field id="price" label="Цена, ₽" error={e.price}>
            <Input id="price" name="price" inputMode="decimal" defaultValue={v.price} required {...errorProps("price", e.price)} />
          </Field>
          <Field id="stock" label="Остаток, шт." error={e.stock}>
            <Input id="stock" name="stock" type="number" min={0} defaultValue={v.stock} {...errorProps("stock", e.stock)} />
          </Field>
        </div>
      </div>
      <Field id="description" label="Описание" error={e.description}>
        <Textarea id="description" name="description" rows={5} defaultValue={v.description} {...errorProps("description", e.description)} />
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field id="image" label="Фото" hint=" — PNG, JPEG или WebP до 5 МБ" error={e.image}>
          <div className="flex items-center gap-3">
            {v.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- превью загруженного файла
              <img src={`/media/${v.image}`} alt="Текущее фото" width={56} height={56} className="size-14 rounded-md border object-cover" />
            ) : null}
            <Input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp" {...errorProps("image", e.image)} />
          </div>
        </Field>
        <div className="flex items-center gap-2 md:pt-7">
          <Checkbox id="isActive" name="isActive" defaultChecked={v.isActive} />
          <Label htmlFor="isActive" className="font-normal">
            Показывать в каталоге
          </Label>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
        <SubmitButton>Сохранить</SubmitButton>
        <SubmitButton variant="outline" name="continue" value="1">
          Сохранить и продолжить
        </SubmitButton>
      </div>
    </form>
  );
}
