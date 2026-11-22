// Демо-данные: npm run db:seed (или npx prisma db seed). Администратор + каталог, пользователи, заказы.
import { prisma } from "../src/server/db";
import { ensureAdmin, loadDemo } from "../src/server/demo/demo";

async function main(): Promise<void> {
  await ensureAdmin();
  const result = await loadDemo();
  console.log(
    `Демо-данные загружены: категорий ${result.categories}, товаров ${result.products}, ` +
      `пользователей ${result.users} (+ администратор), заказов ${result.orders}.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
