import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { OrderError, OutOfStockError } from "@/server/orders";
import { makeProduct, makeUser, order, stockOf } from "../support/factories";

describe("оформление заказа: резерв остатка", () => {
  it("списывает остаток и сохраняет снимок названий и цен", async () => {
    const user = await makeUser();
    const a = await makeProduct({ name: "Чайник", price: 199_000, stock: 5 });
    const b = await makeProduct({ name: "Кружка", price: 49_050, stock: 3 });
    const o = await order(user.id, [[a.id, 2], [b.id, 1]]);

    expect(o).toMatchObject({ id: 1, status: "new", total: 2 * 199_000 + 49_050, userId: user.id });
    expect(await stockOf(a.id)).toBe(3);
    expect(await stockOf(b.id)).toBe(2);
    const items = await prisma.orderItem.findMany({ where: { orderId: o.id }, orderBy: { productId: "asc" } });
    expect(items.map((i) => [i.productName, i.price, i.quantity])).toEqual([["Чайник", 199_000, 2], ["Кружка", 49_050, 1]]);

    // Снимок не меняется при изменении товара.
    await prisma.product.update({ where: { id: a.id }, data: { name: "Новый чайник", price: 1 } });
    const after = await prisma.orderItem.findFirstOrThrow({ where: { orderId: o.id, productId: a.id } });
    expect([after.productName, after.price]).toEqual(["Чайник", 199_000]);
  });

  it("повторяющиеся строки суммируются", async () => {
    const user = await makeUser();
    const p = await makeProduct({ stock: 5, price: 1000 });
    const o = await order(user.id, [[p.id, 1], [p.id, 2]]);
    expect(o.total).toBe(3000);
    expect(await stockOf(p.id)).toBe(2);
  });

  it("можно купить ровно весь остаток", async () => {
    const user = await makeUser();
    const p = await makeProduct({ stock: 2 });
    await order(user.id, [[p.id, 2]]);
    expect(await stockOf(p.id)).toBe(0);
  });

  it("не хватает остатка — заказ не создаётся и ничего не списывается", async () => {
    const user = await makeUser();
    const ok = await makeProduct({ name: "Есть", stock: 5 });
    const few = await makeProduct({ name: "Мало", stock: 1 });
    await expect(order(user.id, [[ok.id, 1], [few.id, 2]])).rejects.toThrow(OutOfStockError);
    await expect(order(user.id, [[ok.id, 1], [few.id, 2]])).rejects.toThrow("Недостаточно на складе: Мало.");
    expect(await stockOf(ok.id)).toBe(5);
    expect(await stockOf(few.id)).toBe(1);
    expect(await prisma.order.count()).toBe(0);
  });

  it("скрытый или удалённый товар не продаётся", async () => {
    const user = await makeUser();
    const hidden = await makeProduct({ name: "Скрытый", isActive: false });
    await expect(order(user.id, [[hidden.id, 1]])).rejects.toThrow("Скрытый");
    await expect(order(user.id, [[999_999, 1]])).rejects.toThrow("товар #999999");
  });

  it("пустая корзина — ошибка", async () => {
    const user = await makeUser();
    const p = await makeProduct();
    await expect(order(user.id, [])).rejects.toThrow(OrderError);
    await expect(order(user.id, [[p.id, 0]])).rejects.toThrow("Корзина пуста.");
  });

  it("CHECK в базе не даёт уйти остатку в минус даже в обход кода", async () => {
    const p = await makeProduct({ stock: 1 });
    await expect(prisma.product.update({ where: { id: p.id }, data: { stock: { decrement: 2 } } })).rejects.toThrow();
    await expect(prisma.product.update({ where: { id: p.id }, data: { price: 0 } })).rejects.toThrow();
  });
});

describe("конкурентные покупки", () => {
  it("последний товар достаётся ровно одному из параллельных покупателей", async () => {
    const users = await Promise.all([makeUser(), makeUser(), makeUser(), makeUser(), makeUser()]);
    const p = await makeProduct({ stock: 1 });
    const results = await Promise.allSettled(users.map((u) => order(u.id, [[p.id, 1]])));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(rejected).toHaveLength(4);
    expect(rejected.every((r) => r.reason instanceof OutOfStockError)).toBe(true);
    expect(await stockOf(p.id)).toBe(0);
    expect(await prisma.order.count()).toBe(1);
  });

  it("встречные заказы на два товара не дают взаимной блокировки и не продают лишнего", async () => {
    const [u1, u2] = await Promise.all([makeUser(), makeUser()]);
    const a = await makeProduct({ stock: 10 });
    const b = await makeProduct({ stock: 10 });
    const runs = Array.from({ length: 10 }, (_, i) =>
      order(i % 2 ? u1.id : u2.id, i % 2 ? [[a.id, 1], [b.id, 1]] : [[b.id, 1], [a.id, 1]]),
    );
    const results = await Promise.allSettled(runs);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
    expect(await stockOf(a.id)).toBe(0);
    expect(await stockOf(b.id)).toBe(0);
    await expect(order(u1.id, [[a.id, 1]])).rejects.toThrow(OutOfStockError);
  });
});
