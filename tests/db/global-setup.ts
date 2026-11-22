/**
 * Перед прогоном: проверяем, что это именно тестовая база, пересоздаём схему public
 * и накатываем миграции (`prisma migrate deploy`) — те же, что в docker и CI.
 */
import { execFileSync } from "node:child_process";
import pg from "pg";
import { databaseUrl } from "../../src/lib/config";

export default async function setup() {
  const url = databaseUrl("test");
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith("_test")) {
    throw new Error(`Тесты БД запускаются только на базе *_test, а не на «${name}».`);
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env: { ...process.env, PRISMA_DB: "test" },
  });
}
