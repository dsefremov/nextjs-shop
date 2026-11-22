/** Перед каждым тестом БД — пустые таблицы и счётчики id с 1. */
import { afterAll, beforeEach } from "vitest";
import { prisma } from "@/server/db";
import { FakePaymentGateway, setPaymentGateway } from "@/server/payments";

const TABLES = [
  "payment_attempt",
  "order_item",
  "order",
  "cart_item",
  "cart",
  "product",
  "category",
  "session",
  "account",
  "verification",
  "user",
];

if (!new URL(process.env.DATABASE_URL ?? "postgresql://x/none").pathname.endsWith("_test")) {
  throw new Error("DATABASE_URL тестов должен указывать на базу *_test.");
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`);
  setPaymentGateway(new FakePaymentGateway());
});

afterAll(async () => {
  await prisma.$disconnect();
});
