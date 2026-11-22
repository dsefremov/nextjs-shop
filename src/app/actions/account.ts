"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/server/auth";
import { requireUser } from "@/server/session";

export interface FormState {
  ok?: string;
  errors: Partial<Record<string, string>>;
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser("/account");
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 150) {
    return { errors: { name: "Имя и фамилия — от 2 до 150 символов." } };
  }
  await auth.api.updateUser({ body: { name }, headers: await headers() });
  revalidatePath("/", "layout");
  return { ok: "Профиль сохранён.", errors: {} };
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Введите текущий пароль."),
    newPassword: z.string().min(8, "Пароль — не короче 8 символов.").max(128, "Пароль — не длиннее 128 символов."),
    newPassword2: z.string(),
  })
  .refine((v) => v.newPassword === v.newPassword2, { path: ["newPassword2"], message: "Пароли не совпадают." });

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser("/account");
  const parsed = passwordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    newPassword2: String(formData.get("newPassword2") ?? ""),
  });
  if (!parsed.success) {
    const errors: FormState["errors"] = {};
    for (const issue of parsed.error.issues) {
      errors[String(issue.path[0])] ??= issue.message;
    }
    return { errors };
  }
  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError) {
      return { errors: { currentPassword: "Текущий пароль неверный." } };
    }
    throw error;
  }
  return { ok: "Пароль изменён. Остальные сеансы завершены.", errors: {} };
}
