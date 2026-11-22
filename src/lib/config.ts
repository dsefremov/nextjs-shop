/**
 * Настройки из окружения. Секреты не хранятся в коде: значение берётся из переменной NAME или из
 * файла NAME_FILE (Docker secrets), а при локальном запуске на хосте — из var/secrets/ (docker/secrets.sh).
 * Модуль без `server-only`: его импортируют prisma.config.ts, сид и тесты.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function readSecret(name: string, fallbackFile?: string): string | undefined {
  const direct = process.env[name];
  if (direct) {
    return direct;
  }
  const file = process.env[`${name}_FILE`] ?? (fallbackFile ? resolve(fallbackFile) : undefined);
  if (file && existsSync(file)) {
    const value = readFileSync(file, "utf8").trim();
    return value || undefined;
  }
  return undefined;
}

export type DatabaseTarget = "app" | "test";

const DEFAULTS: Record<DatabaseTarget, { prefix: string; port: string; name: string; passwordFile: string }> = {
  app: { prefix: "DB", port: "54327", name: "nextjs_shop", passwordFile: "var/secrets/db-password" },
  test: { prefix: "TEST_DB", port: "54328", name: "nextjs_shop_test", passwordFile: "var/secrets/test-db-password" },
};

/**
 * Строка подключения к PostgreSQL. DATABASE_URL / TEST_DATABASE_URL (если заданы) имеют приоритет,
 * иначе собирается из DB_HOST, DB_PORT, DB_NAME, DB_USER и пароля DB_PASSWORD(_FILE)
 * (для тестовой базы — те же имена с префиксом TEST_DB_). Без пароля — для trust-аутентификации в CI.
 */
export function databaseUrl(target: DatabaseTarget = "app"): string {
  const explicit = process.env[target === "app" ? "DATABASE_URL" : "TEST_DATABASE_URL"];
  if (explicit) {
    return explicit;
  }
  const d = DEFAULTS[target];
  const env = (key: string, fallback: string) => process.env[`${d.prefix}_${key}`] || fallback;
  const user = encodeURIComponent(env("USER", "shop"));
  const password = readSecret(`${d.prefix}_PASSWORD`, d.passwordFile);
  const auth = password ? `${user}:${encodeURIComponent(password)}` : user;
  return `postgresql://${auth}@${env("HOST", "127.0.0.1")}:${env("PORT", d.port)}/${env("NAME", d.name)}`;
}
