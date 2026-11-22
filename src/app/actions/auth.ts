"use server";

import { APIError } from "better-auth/api";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/server/auth";
import { findGuestCart, mergeGuestCart } from "@/server/cart";
import { CART_COOKIE } from "@/server/cart-session";
import { flash } from "@/server/flash";
import { safeNext } from "@/server/session";

export interface AuthState {
  email: string;
  name?: string;
  errors: Partial<Record<"name" | "email" | "password" | "password2" | "form", string>>;
}

/** После входа или регистрации корзина гостя сливается с корзиной покупателя. */
async function takeGuestCart(userId: string, guestCartId: string | null): Promise<void> {
  if (guestCartId) {
    await mergeGuestCart(guestCartId, userId);
    (await cookies()).delete(CART_COOKIE);
  }
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  if (!email || !password) {
    return { email, errors: { form: "Введите эл. почту и пароль." } };
  }
  const guestCartId = await findGuestCart((await cookies()).get(CART_COOKIE)?.value);
  let userId: string;
  try {
    const result = await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
    userId = result.user.id;
  } catch (error) {
    if (error instanceof APIError) {
      return { email, errors: { form: "Неверная эл. почта или пароль." } };
    }
    throw error;
  }
  await takeGuestCart(userId, guestCartId);
  redirect(next);
}

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Укажите имя и фамилию.").max(150, "Не длиннее 150 символов."),
    email: z.email("Укажите корректную эл. почту.").max(254),
    password: z.string().min(8, "Пароль — не короче 8 символов.").max(128, "Пароль — не длиннее 128 символов."),
    password2: z.string(),
  })
  .refine((v) => v.password === v.password2, { path: ["password2"], message: "Пароли не совпадают." });

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    password2: String(formData.get("password2") ?? ""),
  };
  const next = safeNext(formData.get("next"));
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    const errors: AuthState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof AuthState["errors"];
      errors[key] ??= issue.message;
    }
    return { email: values.email, name: values.name, errors };
  }
  const guestCartId = await findGuestCart((await cookies()).get(CART_COOKIE)?.value);
  let userId: string;
  try {
    const result = await auth.api.signUpEmail({
      body: { name: parsed.data.name, email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
    });
    userId = result.user.id;
  } catch (error) {
    if (error instanceof APIError) {
      const exists = error.body?.code === "USER_ALREADY_EXISTS" || error.status === "UNPROCESSABLE_ENTITY";
      return {
        email: values.email,
        name: values.name,
        errors: exists ? { email: "Пользователь с такой почтой уже есть." } : { form: "Не удалось зарегистрироваться." },
      };
    }
    throw error;
  }
  await takeGuestCart(userId, guestCartId);
  await flash("success", "Добро пожаловать! Аккаунт создан.");
  redirect(next);
}

export async function logout(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
}
