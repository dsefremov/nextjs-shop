import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { CATALOG, type Credentials, loadCredentials, loadDemo, USERS } from "@/server/demo/demo";
import { mediaRoot } from "@/server/media";
import { randomPassword } from "../support/factories";

function credentials(): Credentials {
  return Object.fromEntries(USERS.map(([key]) => [key, { email: `${key}@demo.test`, password: randomPassword() }])) as Credentials;
}

describe("демо-данные", () => {
  it("каталог, пользователи и 5 заказов — как в django-shop", async () => {
    const result = await loadDemo({ credentials: credentials(), images: false });
    expect(result).toEqual({ categories: 4, products: 24, users: 3, orders: 5 });
    expect(CATALOG.map((c) => c.products.length)).toEqual([6, 6, 6, 6]);
    const orders = await prisma.order.findMany({ orderBy: { id: "asc" }, include: { user: true } });
    expect(orders.map((o) => [o.id, o.status, o.user.name])).toEqual([
      [1, "completed", "Иван Петров"],
      [2, "paid", "Иван Петров"],
      [3, "paid", "Мария Соколова"],
      [4, "new", "Иван Петров"],
      [5, "payment_declined", "Мария Соколова"],
    ]);
    // Даты возрастают вместе с номером.
    const times = orders.map((o) => o.createdAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    const aero = await prisma.product.findUniqueOrThrow({ where: { slug: "besprovodnye-naushniki-aero" } });
    expect([aero.price, aero.stock]).toEqual([599_000, 14]);
    const roles = await prisma.user.findMany({ orderBy: { email: "asc" }, select: { email: true, role: true } });
    expect(roles).toEqual([
      { email: "customer@demo.test", role: "customer" },
      { email: "manager@demo.test", role: "manager" },
      { email: "maria@demo.test", role: "customer" },
    ]);
  });

  it("повторная загрузка: номера заказов и id снова с 1, пользователи не дублируются", async () => {
    const creds = credentials();
    await loadDemo({ credentials: creds, images: false });
    await loadDemo({ credentials: creds, images: false });
    expect((await prisma.order.findMany({ select: { id: true } })).map((o) => o.id).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(await prisma.user.count()).toBe(3);
    expect(await prisma.account.count({ where: { providerId: "credential" } })).toBe(3);
    expect((await prisma.product.aggregate({ _min: { id: true } }))._min.id).toBe(1);
  });

  it("с картинками: файлы лежат в MEDIA_ROOT", async () => {
    await loadDemo({ credentials: credentials(), images: true });
    const p = await prisma.product.findFirstOrThrow({ where: { id: 1 } });
    expect(p.image).toMatch(/^products\/.+\.png$/);
    expect(existsSync(join(mediaRoot(), p.image!))).toBe(true);
  });

  it("без файла учёток — понятная ошибка", () => {
    expect(() => loadCredentials("/nonexistent/demo-users.json")).toThrow("docker/secrets.sh");
  });
});
