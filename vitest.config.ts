/**
 * Vitest: два проекта.
 *  - unit — чистые функции, без БД;
 *  - db   — бизнес-логика и server actions на настоящем PostgreSQL 17 (отдельная тестовая база,
 *           имя обязано оканчиваться на _test; схема пересоздаётся миграциями перед прогоном).
 */
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { databaseUrl } from "./src/lib/config.ts";

const src = fileURLToPath(new URL("./src", import.meta.url));
const empty = fileURLToPath(new URL("./tests/support/empty.ts", import.meta.url));

const alias = { "@": src, "server-only": empty };

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "db",
          environment: "node",
          include: ["tests/db/**/*.test.ts"],
          globalSetup: ["tests/db/global-setup.ts"],
          setupFiles: ["tests/db/setup.ts"],
          // Одна база на все файлы: файлы идут последовательно, между тестами — TRUNCATE.
          fileParallelism: false,
          env: {
            DATABASE_URL: databaseUrl("test"),
            MEDIA_ROOT: fileURLToPath(new URL("./var/test-media", import.meta.url)),
            // Секрет сессий для тестов — случайный на каждый прогон, нигде не хранится.
            BETTER_AUTH_SECRET: randomBytes(32).toString("hex"),
            BETTER_AUTH_URL: "http://127.0.0.1:8108",
          },
        },
      },
    ],
  },
});
