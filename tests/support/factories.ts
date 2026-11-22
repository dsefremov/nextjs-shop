/** Фабрики тестовых данных для тестов на PostgreSQL. Пароли — случайные, в коде не хранятся. */
import { randomBytes } from "node:crypto";
import type { Product } from "@/generated/prisma/client";
import { prisma } from "@/server/db";
import { upsertUserWithPassword } from "@/server/demo/demo";
import { placeOrder, type CheckoutData } from "@/server/orders";

let seq = 0;
const next = () => ++seq;

export function randomPassword(): string {
  return randomBytes(12).toString("base64url");
}

export async function makeUser(role: "customer" | "manager" | "admin" = "customer", name = "Тестовый Покупатель") {
  const password = randomPassword();
  const email = `${role}${next()}@example.test`;
  const user = await upsertUserWithPassword(email, name, role, password);
  return { ...user, password };
}

export async function makeCategory(name = `Категория ${next()}`) {
  const n = next();
  return prisma.category.create({ data: { name, slug: `cat-${n}`, position: n } });
}

export async function makeProduct(
  overrides: Partial<Pick<Product, "name" | "price" | "stock" | "isActive" | "description" | "categoryId" | "createdAt">> = {},
): Promise<Product> {
  const n = next();
  const categoryId = overrides.categoryId ?? (await makeCategory()).id;
  return prisma.product.create({
    data: {
      name: `Товар ${n}`,
      slug: `product-${n}`,
      description: "Описание товара",
      price: 100_000,
      stock: 10,
      ...overrides,
      categoryId,
    },
  });
}

export const CHECKOUT: CheckoutData = {
  customerName: "Иван Петров",
  customerEmail: "ivan@example.test",
  customerPhone: "+7 900 000-00-00",
  address: "г. Москва, ул. Тестовая, д. 1",
};

export function order(userId: string, lines: [number, number][], data: Partial<CheckoutData> = {}) {
  return placeOrder(userId, lines, { ...CHECKOUT, ...data });
}

export async function stockOf(productId: number): Promise<number> {
  return (await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stock;
}
