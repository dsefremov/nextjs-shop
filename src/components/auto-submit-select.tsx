"use client";

import type { ComponentProps } from "react";
import { NativeSelect } from "@/components/ui/native-select";

/** Нативный select, который отправляет свою форму при выборе (сортировка, статус). */
export function AutoSubmitSelect(props: ComponentProps<typeof NativeSelect>) {
  return <NativeSelect {...props} onChange={(event) => event.currentTarget.form?.requestSubmit()} />;
}
