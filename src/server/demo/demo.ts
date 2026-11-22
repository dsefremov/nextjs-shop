/**
 * Демо-данные — тот же набор, что в laravel-shop, symphony-shop, bitrix-shop(-classic) и django-shop:
 * 4 категории × 6 товаров (цены в рублях, остатки, картинки), менеджер магазина, два покупателя и
 * 5 заказов, оформленных и оплаченных через сервисы (с резервом остатка). Пароли демо-учёток в коде
 * не хранятся: их генерирует docker/secrets.sh в var/demo-users.json (администратора — в var/admin-password).
 */
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { hashPassword } from "better-auth/crypto";
import { readSecret } from "@/lib/config";
import { makeSlug } from "@/lib/slug";
import { prisma } from "../db";
import { mediaRoot, saveImage } from "../media";
import { pay, placeOrder, setStatus } from "../orders";
import { makePng, seedOf } from "./seed-image";

export const EMAIL_DOMAIN = "nextjs-shop.test";
export const ADMIN_EMAIL = `admin@${EMAIL_DOMAIN}`;

type RGB = readonly [number, number, number];

export const CATALOG: { name: string; color: RGB; description: string; products: [string, number, number][] }[] = [
  {
    name: "Электроника",
    color: [37, 99, 235],
    description: "Гаджеты и аксессуары для дома и работы.",
    products: [
      ["Беспроводные наушники Aero", 5990, 15],
      ["Смарт-часы Pulse 2", 12490, 8],
      ["Портативная колонка Wave", 4290, 20],
      ["Внешний аккумулятор 20 000 мА·ч", 2790, 30],
      ["Механическая клавиатура K87", 6990, 6],
      ["Веб-камера Full HD", 3490, 0],
    ],
  },
  {
    name: "Книги",
    color: [180, 83, 9],
    description: "Художественная и профессиональная литература.",
    products: [
      ["«Чистый код», Роберт Мартин", 1290, 12],
      ["«Мастер и Маргарита», М. Булгаков", 690, 25],
      ["«Next.js: быстрый старт»", 1590, 10],
      ["«Война и мир», Л. Толстой (2 тома)", 1890, 7],
      ["«Алгоритмы. Построение и анализ»", 3490, 4],
      ["«Сто лет одиночества», Г. Маркес", 790, 0],
    ],
  },
  {
    name: "Дом и кухня",
    color: [5, 150, 105],
    description: "Посуда, текстиль и полезные мелочи.",
    products: [
      ["Френч-пресс 1 л", 1490, 18],
      ["Набор ножей «Шеф»", 4990, 5],
      ["Чугунная сковорода 26 см", 3290, 9],
      ["Электрочайник Glass", 2490, 14],
      ["Плед флисовый 150×200", 1790, 22],
      ["Набор контейнеров, 6 шт.", 990, 40],
    ],
  },
  {
    name: "Спорт",
    color: [190, 24, 93],
    description: "Инвентарь для тренировок дома и на улице.",
    products: [
      ["Коврик для йоги 6 мм", 1990, 16],
      ["Гантели 2 × 5 кг", 3990, 6],
      ["Скакалка скоростная", 590, 35],
      ["Фитнес-резинки, 5 шт.", 890, 28],
      ["Бутылка для воды 0,7 л", 690, 50],
      ["Рюкзак спортивный 25 л", 2990, 0],
    ],
  },
];

/** key, имя и фамилия, роль */
export const USERS = [
  ["manager", "Менеджер магазина", "manager"],
  ["customer", "Иван Петров", "customer"],
  ["maria", "Мария Соколова", "customer"],
] as const;

export type DemoKey = (typeof USERS)[number][0];
export type Credentials = Record<DemoKey, { email: string; password: string }>;

export class DemoDataError extends Error {
  override name = "DemoDataError";
}

export function demoUsersFile(): string {
  return process.env.DEMO_USERS_FILE ?? "var/demo-users.json";
}

export function loadCredentials(path = demoUsersFile()): Credentials {
  if (!existsSync(path)) {
    throw new DemoDataError(`Нет файла ${path}: запустите docker/secrets.sh`);
  }
  const data = JSON.parse(readFileSync(path, "utf8")) as Record<string, { email?: unknown; password?: unknown }>;
  const result = {} as Credentials;
  for (const [key] of USERS) {
    const entry = data[key];
    if (typeof entry?.email !== "string" || typeof entry.password !== "string" || !entry.email || !entry.password) {
      throw new DemoDataError(`В ${path} нет учётки «${key}»: запустите docker/secrets.sh`);
    }
    result[key] = { email: entry.email, password: entry.password };
  }
  return result;
}

/** Создаёт или обновляет пользователя с паролем (как это делает Better Auth: account providerId=credential). */
export async function upsertUserWithPassword(email: string, name: string, role: string, password: string) {
  const hash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, emailVerified: true },
    create: { id: randomBytes(16).toString("hex"), email, name, role, emailVerified: true },
  });
  const account = await prisma.account.findFirst({ where: { userId: user.id, providerId: "credential" } });
  if (account) {
    await prisma.account.update({ where: { id: account.id }, data: { password: hash } });
  } else {
    await prisma.account.create({
      data: { id: randomBytes(16).toString("hex"), userId: user.id, accountId: user.id, providerId: "credential", password: hash },
    });
  }
  return user;
}

/** Администратор (полный доступ к /admin, включая список пользователей). */
export async function ensureAdmin(): Promise<void> {
  const password = readSecret("ADMIN_PASSWORD", "var/admin-password");
  if (!password) {
    throw new DemoDataError("Нет пароля администратора (var/admin-password): запустите docker/secrets.sh");
  }
  await upsertUserWithPassword(ADMIN_EMAIL, "Администратор", "admin", password);
}

/** Удаляет заказы, корзины и каталог; номера заказов и id товаров снова с 1 — как на чистой установке. */
export async function purge(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "payment_attempt", "order_item", "order", "cart_item", "cart", "product", "category" RESTART IDENTITY CASCADE',
  );
  await rm(join(mediaRoot(), "products"), { recursive: true, force: true });
  await rm(join(mediaRoot(), "categories"), { recursive: true, force: true });
}

const DAY = 86_400_000;

export async function loadDemo(options: { credentials?: Credentials; images?: boolean } = {}) {
  const creds = options.credentials ?? loadCredentials();
  const images = options.images ?? true;
  await purge();

  const products: { id: number; slug: string }[] = [];
  const baseTime = Date.now() - 30 * DAY;
  let position = 100;
  for (const data of CATALOG) {
    const slug = makeSlug(data.name);
    const image = images ? await saveImage("categories", slug, makePng(data.color, seedOf(slug), 400)) : null;
    const category = await prisma.category.create({
      data: { name: data.name, slug, description: data.description, position, image },
    });
    position += 100;
    for (const [name, price, stock] of data.products) {
      const productSlug = makeSlug(name);
      const productImage = images ? await saveImage("products", productSlug, makePng(data.color, seedOf(productSlug))) : null;
      const product = await prisma.product.create({
        data: {
          categoryId: category.id,
          name,
          slug: productSlug,
          description:
            `${name} — товар из раздела «${data.name}». Демо-описание для локальной базы: ` +
            "характеристики, комплектация и условия гарантии указываются здесь.",
          price: price * 100,
          stock,
          image: productImage,
        },
      });
      products.push({ id: product.id, slug: productSlug });
    }
  }

  // Новизна: товары «добавлялись» по одному в день — сортировка «Сначала новые» стабильна.
  for (const [index, product] of products.entries()) {
    await prisma.product.update({
      where: { id: product.id },
      data: { createdAt: new Date(baseTime + (index % 24) * DAY + index * 60_000) },
    });
  }

  const users = {} as Record<DemoKey, { id: string; name: string; email: string }>;
  for (const [key, name, role] of USERS) {
    users[key] = await upsertUserWithPassword(creds[key].email, name, role, creds[key].password);
  }

  const p = (i: number) => products[i]!.id;
  const { customer, maria } = users;
  // Порядок оформления = порядок дат: №1 — самый старый, №5 — самый новый.
  await demoOrder(customer, [[p(0), 1], [p(8), 2]], "completed", 10 * DAY);
  await demoOrder(customer, [[p(13), 1]], "paid", 3 * DAY);
  await demoOrder(maria, [[p(3), 1]], "paid", 2 * DAY);
  await demoOrder(customer, [[p(19), 1], [p(22), 2]], "new", 1 * DAY);
  await demoOrder(maria, [[p(15), 1]], "declined", 5 * 3_600_000);

  return {
    categories: await prisma.category.count(),
    products: await prisma.product.count(),
    users: Object.keys(users).length,
    orders: await prisma.order.count(),
  };
}

async function demoOrder(
  user: { id: string; name: string; email: string },
  lines: [number, number][],
  state: "new" | "paid" | "completed" | "declined",
  ago: number,
): Promise<void> {
  const order = await placeOrder(user.id, lines, {
    customerName: user.name,
    customerEmail: user.email,
    customerPhone: "+7 900 123-45-67",
    address: "г. Москва, ул. Тверская, д. 1, кв. 10",
  });
  if (state === "declined") {
    await pay(order.id, { approve: false });
  } else if (state === "paid" || state === "completed") {
    await pay(order.id, { approve: true });
  }
  if (state === "completed") {
    await setStatus(order.id, "completed");
  }
  const when = new Date(Date.now() - ago);
  await prisma.order.update({
    where: { id: order.id },
    data: { createdAt: when, updatedAt: when, paidAt: state === "paid" || state === "completed" ? when : null },
  });
  await prisma.paymentAttempt.updateMany({ where: { orderId: order.id }, data: { createdAt: when } });
}
