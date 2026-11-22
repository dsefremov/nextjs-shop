// Конфигурация Prisma CLI (Prisma 7). Строка подключения собирается из окружения и var/secrets/
// (см. src/lib/config.ts) — паролей в репозитории нет. PRISMA_DB=test — тестовая база.
import { defineConfig } from "prisma/config";
import { databaseUrl } from "./src/lib/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl(process.env.PRISMA_DB === "test" ? "test" : "app"),
  },
});
