/**
 * Бизнес-операции с заказами. Всё, что меняет остаток, — в одной транзакции с блокировкой строк
 * (SELECT … FOR UPDATE в порядке id), поэтому два покупателя не купят последний товар одновременно.
 */
import type { Order, OrderStatus } from "@/generated/prisma/client";
import { canTransition, isOrderStatus, isPayable, STATUS_LABELS } from "@/lib/order-rules";
import { prisma, type Tx } from "./db";
import { getPaymentGateway, type PaymentGateway, type PaymentResult } from "./payments";

/** Ошибка бизнес-правила; сообщение показывается пользователю. */
export class OrderError extends Error {
  override name = "OrderError";
}

export class OutOfStockError extends OrderError {
  constructor(readonly names: string[]) {
    super(`Недостаточно на складе: ${names.join(", ")}.`);
  }
}

export interface CheckoutData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  comment?: string;
}

interface LockedProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
  isActive: boolean;
}

async function lockProducts(tx: Tx, ids: number[]): Promise<LockedProduct[]> {
  if (ids.length === 0) {
    return [];
  }
  return tx.$queryRaw<LockedProduct[]>`
    SELECT "id", "name", "price", "stock", "isActive" FROM "product"
    WHERE "id" = ANY(${ids}::int[]) ORDER BY "id" FOR UPDATE`;
}

async function lockOrder(tx: Tx, orderId: number): Promise<Order> {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT "id" FROM "order" WHERE "id" = ${orderId} FOR UPDATE`;
  if (rows.length === 0) {
    throw new OrderError(`Заказ №${orderId} не найден.`);
  }
  return tx.order.findUniqueOrThrow({ where: { id: orderId } });
}

/**
 * Оформляет заказ в одной транзакции: блокирует строки товаров в порядке id, проверяет остаток,
 * резервирует его (списывает со склада) и сохраняет снимок названий и цен.
 */
export async function placeOrder(
  userId: string,
  lines: Iterable<readonly [productId: number, quantity: number]>,
  data: CheckoutData,
): Promise<Order> {
  const wanted = new Map<number, number>();
  for (const [productId, quantity] of lines) {
    if (quantity > 0) {
      wanted.set(productId, (wanted.get(productId) ?? 0) + quantity);
    }
  }
  if (wanted.size === 0) {
    throw new OrderError("Корзина пуста.");
  }
  const ids = [...wanted.keys()].sort((a, b) => a - b);

  return prisma.$transaction(async (tx) => {
    const products = await lockProducts(tx, ids);
    const found = new Map(products.map((p) => [p.id, p]));
    const missing = ids
      .filter((id) => {
        const p = found.get(id);
        return !p || !p.isActive || p.stock < (wanted.get(id) ?? 0);
      })
      .map((id) => found.get(id)?.name ?? `товар #${id}`);
    if (missing.length > 0) {
      throw new OutOfStockError(missing);
    }
    const total = ids.reduce((sum, id) => sum + found.get(id)!.price * wanted.get(id)!, 0);
    const order = await tx.order.create({
      data: {
        userId,
        status: "new",
        total,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        address: data.address,
        comment: data.comment ?? "",
        items: {
          create: ids.map((id) => ({
            productId: id,
            productName: found.get(id)!.name,
            price: found.get(id)!.price,
            quantity: wanted.get(id)!,
          })),
        },
      },
    });
    for (const id of ids) {
      await tx.product.update({ where: { id }, data: { stock: { decrement: wanted.get(id)! } } });
    }
    return order;
  });
}

/**
 * Попытка оплаты через шлюз. Успех → «Оплачен»; отказ → «Оплата отклонена», резерв остаётся,
 * можно повторить. Каждая попытка записывается в историю оплаты.
 */
export async function pay(
  orderId: number,
  { approve, gateway = getPaymentGateway() }: { approve: boolean; gateway?: PaymentGateway },
): Promise<{ order: Order; result: PaymentResult }> {
  return prisma.$transaction(async (tx) => {
    const locked = await lockOrder(tx, orderId);
    if (!isPayable(locked.status)) {
      throw new OrderError(`Заказ №${locked.id} нельзя оплатить в статусе «${STATUS_LABELS[locked.status]}».`);
    }
    const result = await gateway.charge(locked.id, locked.total, { approve });
    await tx.paymentAttempt.create({
      data: {
        orderId: locked.id,
        succeeded: result.succeeded,
        amount: locked.total,
        reference: result.reference,
        message: result.message,
      },
    });
    const order = await tx.order.update({
      where: { id: locked.id },
      data: result.succeeded ? { status: "paid", paidAt: new Date() } : { status: "payment_declined" },
    });
    return { order, result };
  });
}

/** Смена статуса по таблице переходов; отмена возвращает остаток ровно один раз. */
export async function setStatus(orderId: number, status: OrderStatus | string): Promise<Order> {
  if (!isOrderStatus(status)) {
    throw new OrderError(`Неизвестный статус: ${status}.`);
  }
  return prisma.$transaction(async (tx) => {
    const locked = await lockOrder(tx, orderId);
    if (locked.status === status) {
      return locked;
    }
    if (!canTransition(locked.status, status)) {
      throw new OrderError(
        `Заказ №${locked.id}: нельзя перейти из «${STATUS_LABELS[locked.status]}» в «${STATUS_LABELS[status]}».`,
      );
    }
    let stockReturnedAt = locked.stockReturnedAt;
    if (status === "cancelled" && stockReturnedAt === null) {
      await returnStock(tx, locked.id);
      stockReturnedAt = new Date();
    }
    return tx.order.update({ where: { id: locked.id }, data: { status, stockReturnedAt } });
  });
}

export function cancelOrder(orderId: number): Promise<Order> {
  return setStatus(orderId, "cancelled");
}

async function returnStock(tx: Tx, orderId: number): Promise<void> {
  const items = await tx.orderItem.findMany({ where: { orderId, productId: { not: null } } });
  const returns = new Map<number, number>();
  for (const item of items) {
    if (item.productId !== null) {
      returns.set(item.productId, (returns.get(item.productId) ?? 0) + item.quantity);
    }
  }
  const ids = [...returns.keys()].sort((a, b) => a - b);
  // Блокируем товары в том же порядке, что и оформление, — без взаимных блокировок.
  await lockProducts(tx, ids);
  for (const id of ids) {
    await tx.product.update({ where: { id }, data: { stock: { increment: returns.get(id)! } } });
  }
}
