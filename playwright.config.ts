import { defineConfig, devices } from "@playwright/test";

/**
 * E2E и скриншоты — против локального стенда (docker compose: Next.js на :8108) на свежих
 * демо-данных (npm run db:seed). Без ретраев, 1 воркер, без увеличенных таймаутов. Только локально (не в CI).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? `http://127.0.0.1:${process.env.HTTP_PORT ?? "8108"}`,
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
    trace: "retain-on-failure",
    // Язык интерфейса Chromium — русский (формат полей даты, подписи браузера).
    launchOptions: {
      args: ["--lang=ru-RU"],
      env: { ...process.env, LANG: "ru_RU.UTF-8", LANGUAGE: "ru" },
    },
  },
  projects: [
    {
      name: "e2e",
      testMatch: /purchase\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "screenshots",
      testMatch: /screenshots\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
