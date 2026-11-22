"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

/** Кнопка отправки формы: на время запроса блокируется (без повторной отправки). */
export function SubmitButton({ disabled, ...props }: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending || disabled} aria-disabled={pending || disabled} {...props} />;
}
