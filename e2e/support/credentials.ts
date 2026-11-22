import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

/**
 * Учётные данные демо-пользователей. Паролей в репозитории нет: их генерирует docker/secrets.sh
 * в var/demo-users.json (вне git). Можно переопределить окружением E2E_<ROLE>_EMAIL / E2E_<ROLE>_PASSWORD.
 */
export type Role = "customer" | "manager" | "maria";
export interface Credentials {
  email: string;
  password: string;
}

export function credentials(role: Role): Credentials {
  const prefix = `E2E_${role.toUpperCase()}_`;
  const email = process.env[`${prefix}EMAIL`];
  const password = process.env[`${prefix}PASSWORD`];
  if (email && password) {
    return { email, password };
  }
  const file = resolve(process.env.DEMO_USERS_FILE ?? "var/demo-users.json");
  const users = JSON.parse(readFileSync(file, "utf8")) as Partial<Record<Role, Credentials>>;
  const user = users[role];
  if (!user) {
    throw new Error(`Нет пользователя «${role}» в ${file}: запустите docker/secrets.sh.`);
  }
  return user;
}

/** Вход через форму сайта (менеджер тоже: сессия общая с /admin). */
export async function login(page: Page, role: Role, next = "/"): Promise<void> {
  const user = credentials(role);
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Эл. почта").fill(user.email);
  await page.getByLabel("Пароль", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}
