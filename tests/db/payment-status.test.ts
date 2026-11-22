import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { cancelOrder, OrderError, pay, setStatus } from "@/server/orders";
import type { PaymentGateway } from "@/server/payments";
import { makeProduct, makeUser, order, stockOf } from "../support/factories";

async function newOrder(stock = 5, quantity = 2) {
  const user = await makeUser();
  const p = await makeProduct({ stock, price: 50_000 });
  const o = await order(user.id, [[p.id, quantity]]);
  return { user, p, o };
}

describe("тестовая оплата", () => {
  it("успешная оплата: «Оплачен», дата оплаты, попытка в истории", async () => {
    const { o } = await newOrder();
    const { order: paid, result } = await pay(o.id, { approve: true });
    expect(result.succeeded).toBe(true);
    expect(paid.status).toBe("paid");
    expect(paid.paidAt).toBeInstanceOf(Date);
    const attempts = await prisma.paymentAttempt.findMany({ where: { orderId: o.id } });
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toMatchObject({ succeeded: true, amount: o.total, message: "Оплата прошла успешно." });
  });

  it("отказ → «Оплата отклонена», резерв остаётся; повтор оплачивает заказ", async () => {
    const { o, p } = await newOrder(5, 2);
    const declined = await pay(o.id, { approve: false });
    expect(declined.order.status).toBe("payment_declined");
    expect(declined.order.paidAt).toBeNull();
    expect(await stockOf(p.id)).toBe(3);

    const second = await pay(o.id, { approve: false });
    expect(second.order.status).toBe("payment_declined");
    const retry = await pay(o.id, { approve: true });
    expect(retry.order.status).toBe("paid");
    expect(await stockOf(p.id)).toBe(3);

    const attempts = await prisma.paymentAttempt.findMany({ where: { orderId: o.id }, orderBy: { id: "asc" } });
    expect(attempts.map((a) => a.succeeded)).toEqual([false, false, true]);
    expect(new Set(attempts.map((a) => a.reference)).size).toBe(3);
  });

  it.each(["paid", "processing", "completed", "cancelled"] as const)("в статусе %s оплатить нельзя", async (status) => {
    const { o } = await newOrder();
    if (status !== "cancelled") {
      await pay(o.id, { approve: true });
    }
    if (status === "processing" || status === "completed" || status === "cancelled") {
      await setStatus(o.id, status);
    }
    await expect(pay(o.id, { approve: true })).rejects.toThrow(OrderError);
    expect(await prisma.paymentAttempt.count({ where: { orderId: o.id, succeeded: true } })).toBe(status === "cancelled" ? 0 : 1);
  });

  it("несуществующий заказ", async () => {
    await expect(pay(12345, { approve: true })).rejects.toThrow("Заказ №12345 не найден.");
  });

  it("сбой шлюза откатывает транзакцию: ни попытки, ни смены статуса", async () => {
    const { o } = await newOrder();
    const broken: PaymentGateway = { charge: () => Promise.reject(new Error("timeout")) };
    await expect(pay(o.id, { approve: true, gateway: broken })).rejects.toThrow("timeout");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe("new");
    expect(await prisma.paymentAttempt.count()).toBe(0);
  });

  it("две параллельные оплаты одного заказа: успешна только одна", async () => {
    const { o } = await newOrder();
    const results = await Promise.allSettled([pay(o.id, { approve: true }), pay(o.id, { approve: true })]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.paymentAttempt.count({ where: { orderId: o.id } })).toBe(1);
  });
});

describe("смена статусов и возврат остатка", () => {
  it("отмена нового заказа возвращает остаток", async () => {
    const { o, p } = await newOrder(5, 2);
    const cancelled = await cancelOrder(o.id);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.stockReturnedAt).toBeInstanceOf(Date);
    expect(await stockOf(p.id)).toBe(5);
  });

  it("остаток возвращается ровно один раз (повторная и параллельная отмена)", async () => {
    const { o, p } = await newOrder(5, 2);
    await Promise.allSettled([cancelOrder(o.id), cancelOrder(o.id), cancelOrder(o.id)]);
    await cancelOrder(o.id);
    expect(await stockOf(p.id)).toBe(5);
  });

  it("отмена оплаченного и «в работе» заказа менеджером возвращает остаток", async () => {
    const { o, p } = await newOrder(5, 2);
    await pay(o.id, { approve: true });
    await setStatus(o.id, "processing");
    await setStatus(o.id, "cancelled");
    expect(await stockOf(p.id)).toBe(5);
  });

  it("выполненный заказ отменить нельзя, остаток не меняется", async () => {
    const { o, p } = await newOrder(5, 2);
    await pay(o.id, { approve: true });
    await setStatus(o.id, "completed");
    await expect(setStatus(o.id, "cancelled")).rejects.toThrow("нельзя перейти из «Выполнен» в «Отменён»");
    expect(await stockOf(p.id)).toBe(3);
  });

  it("недопустимые переходы и неизвестные статусы", async () => {
    const { o } = await newOrder();
    await expect(setStatus(o.id, "paid")).rejects.toThrow(OrderError);
    await expect(setStatus(o.id, "completed")).rejects.toThrow(OrderError);
    await expect(setStatus(o.id, "shipped")).rejects.toThrow("Неизвестный статус: shipped.");
    expect((await setStatus(o.id, "new")).status).toBe("new");
  });

  it("удалённый товар: отмена не падает, остальное возвращается", async () => {
    const user = await makeUser();
    const keep = await makeProduct({ stock: 3 });
    const gone = await makeProduct({ stock: 3 });
    const o = await order(user.id, [[keep.id, 1], [gone.id, 1]]);
    await prisma.product.delete({ where: { id: gone.id } });
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: o.id, productId: null } });
    expect(item.productName).toBe(gone.name);
    await cancelOrder(o.id);
    expect(await stockOf(keep.id)).toBe(3);
  });
});
