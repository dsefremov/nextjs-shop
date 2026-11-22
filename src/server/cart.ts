/**
 * Корзина в БД: у гостя — анонимная корзина (её id лежит в httpOnly-куке), у вошедшего — корзина,
 * привязанная к пользователю (переживает выход и другие устройства). При входе корзина гостя
 * сливается с корзиной покупателя. Количество всегда ограничено остатком.
 */
import type { Category, Product } from "@/generated/prisma/client";
import { prisma } from "./db";

export class CartError extends Error {
  override name = "CartError";
}

export interface CartLine {
  product: Product & { category: Category };
  quantity: number;
  total: number;
}

export async function userCartId(userId: string): Promise<string> {
  const cart = await prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } });
  return cart.id;
}

export async function createGuestCart(): Promise<string> {
  return (await prisma.cart.create({ data: {} })).id;
}

/** Корзина гостя по id из куки (корзины пользователей так не находятся). */
export async function findGuestCart(cartId: string | undefined): Promise<string | null> {
  if (!cartId || !/^[0-9a-f-]{36}$/i.test(cartId)) {
    return null;
  }
  const cart = await prisma.cart.findFirst({ where: { id: cartId, userId: null }, select: { id: true } });
  return cart?.id ?? null;
}

async function quantityOf(cartId: string, productId: number): Promise<number> {
  const item = await prisma.cartItem.findUnique({ where: { cartId_productId: { cartId, productId } } });
  return item?.quantity ?? 0;
}

async function store(cartId: string, productId: number, quantity: number): Promise<void> {
  if (quantity > 0) {
    await prisma.cartItem.upsert({
      where: { cartId_productId: { cartId, productId } },
      update: { quantity },
      create: { cartId, productId, quantity },
    });
  } else {
    await prisma.cartItem.deleteMany({ where: { cartId, productId } });
  }
}

/** Добавляет товар; итоговое количество не больше остатка. Возвращает количество в корзине. */
export async function addToCart(cartId: string, product: Product, quantity: number): Promise<number> {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new CartError("Количество должно быть не меньше 1.");
  }
  if (!product.isActive || product.stock < 1) {
    throw new CartError("Товара нет в наличии.");
  }
  const current = await quantityOf(cartId, product.id);
  if (current >= product.stock) {
    throw new CartError(`В корзине уже весь остаток: ${product.stock} шт.`);
  }
  const next = Math.min(current + quantity, product.stock);
  await store(cartId, product.id, next);
  return next;
}

/** Задаёт количество (0 — удалить), не больше остатка. */
export async function updateCartQuantity(cartId: string, product: Product, quantity: number): Promise<number> {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new CartError("Количество не может быть отрицательным.");
  }
  const next = product.isActive ? Math.min(quantity, product.stock) : 0;
  await store(cartId, product.id, next);
  return next;
}

export async function removeFromCart(cartId: string, productId: number): Promise<void> {
  await store(cartId, productId, 0);
}

export async function clearCart(cartId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cartId } });
}

/** Позиции корзины (скрытые товары не показываются), по названию товара. */
export async function cartLines(cartId: string | null): Promise<CartLine[]> {
  if (!cartId) {
    return [];
  }
  const items = await prisma.cartItem.findMany({
    where: { cartId, product: { isActive: true } },
    include: { product: { include: { category: true } } },
  });
  return items
    .map((item) => ({ product: item.product, quantity: item.quantity, total: item.product.price * item.quantity }))
    .sort((a, b) => a.product.name.localeCompare(b.product.name, "ru"));
}

export async function cartCount(cartId: string | null): Promise<number> {
  if (!cartId) {
    return 0;
  }
  const result = await prisma.cartItem.aggregate({
    where: { cartId, product: { isActive: true } },
    _sum: { quantity: true },
  });
  return result._sum.quantity ?? 0;
}

/** Сливает корзину гостя с корзиной покупателя: количества суммируются (не больше остатка). */
export async function mergeGuestCart(guestCartId: string, userId: string): Promise<void> {
  const target = await userCartId(userId);
  if (target === guestCartId) {
    return;
  }
  await prisma.$transaction(async (tx) => {
    const guest = await tx.cart.findFirst({ where: { id: guestCartId, userId: null }, include: { items: true } });
    if (!guest) {
      return;
    }
    const ids = guest.items.map((i) => i.productId);
    const [products, existing] = await Promise.all([
      tx.product.findMany({ where: { id: { in: ids }, isActive: true } }),
      tx.cartItem.findMany({ where: { cartId: target, productId: { in: ids } } }),
    ]);
    const have = new Map(existing.map((i) => [i.productId, i.quantity]));
    for (const product of products) {
      const added = guest.items.find((i) => i.productId === product.id)?.quantity ?? 0;
      const quantity = Math.min(added + (have.get(product.id) ?? 0), product.stock);
      if (quantity > 0) {
        await tx.cartItem.upsert({
          where: { cartId_productId: { cartId: target, productId: product.id } },
          update: { quantity },
          create: { cartId: target, productId: product.id, quantity },
        });
      }
    }
    await tx.cart.delete({ where: { id: guest.id } });
  });
}
