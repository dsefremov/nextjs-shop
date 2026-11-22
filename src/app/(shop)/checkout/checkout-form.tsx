"use client";

import { useActionState } from "react";
import { checkoutAction, type CheckoutState, type CheckoutValues } from "@/app/actions/orders";
import { errorProps, Field } from "@/components/field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CheckoutForm({ initial }: { initial: CheckoutValues }) {
  const [state, action] = useActionState<CheckoutState, FormData>(checkoutAction, { values: initial, errors: {} });
  const { values, errors } = state;
  return (
    <form action={action} className="space-y-4" noValidate>
      {errors.form ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" data-testid="checkout-error">
          {errors.form}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="customerName" label="Имя и фамилия" error={errors.customerName}>
          <Input id="customerName" name="customerName" defaultValue={values.customerName} autoComplete="name" required {...errorProps("customerName", errors.customerName)} />
        </Field>
        <Field id="customerEmail" label="Эл. почта" error={errors.customerEmail}>
          <Input id="customerEmail" name="customerEmail" type="email" defaultValue={values.customerEmail} autoComplete="email" required {...errorProps("customerEmail", errors.customerEmail)} />
        </Field>
        <Field id="customerPhone" label="Телефон" error={errors.customerPhone}>
          <Input id="customerPhone" name="customerPhone" type="tel" defaultValue={values.customerPhone} autoComplete="tel" required {...errorProps("customerPhone", errors.customerPhone)} />
        </Field>
        <Field id="address" label="Адрес доставки" error={errors.address}>
          <Input id="address" name="address" defaultValue={values.address} autoComplete="street-address" required {...errorProps("address", errors.address)} />
        </Field>
      </div>
      <Field id="comment" label="Комментарий к заказу" hint=" (необязательно)" error={errors.comment}>
        <Textarea id="comment" name="comment" rows={3} defaultValue={values.comment} {...errorProps("comment", errors.comment)} />
      </Field>
      <p className="rounded-lg bg-neutral-50 px-3 py-2.5 text-sm text-neutral-600">
        Оплата — <strong className="text-neutral-900">тестовая</strong>: после оформления на странице заказа можно оплатить
        или смоделировать отказ. Товар резервируется сразу.
      </p>
      <SubmitButton className="h-9 px-4" data-testid="place-order">
        Подтвердить заказ
      </SubmitButton>
    </form>
  );
}
