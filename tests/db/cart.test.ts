import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import {
  addToCart,
  cartCount,
  cartLines,
  CartError,
  clearCart,
  createGuestCart,
  findGuestCart,
  mergeGuestCart,
  removeFromCart,
  updateCartQuantity,
  userCartId,
} from "@/server/cart";
import { makeProduct, makeUser } from "../support/factories";

describe("корзина", () => {
  it("добавление суммирует количество, но не больше остатка", async () => {
    const cart = await createGuestCart();
    const p = await makeProduct({ stock: 3 });
    expect(await addToCart(cart, p, 1)).toBe(1);
    expect(await addToCart(cart, p, 5)).toBe(3);
    await expect(addToCart(cart, p, 1)).rejects.toThrow("В корзине уже весь остаток: 3 шт.");
    expect(await cartCount(cart)).toBe(3);
  });

  it("нельзя добавить отсутствующий, скрытый товар или неверное количество", async () => {
    const cart = await createGuestCart();
    const none = await makeProduct({ stock: 0 });
    const hidden = await makeProduct({ isActive: false });
    const ok = await makeProduct();
    await expect(addToCart(cart, none, 1)).rejects.toThrow("Товара нет в наличии.");
    await expect(addToCart(cart, hidden, 1)).rejects.toThrow(CartError);
    await expect(addToCart(cart, ok, 0)).rejects.toThrow("не меньше 1");
    await expect(addToCart(cart, ok, 1.5)).rejects.toThrow(CartError);
    expect(await cartCount(cart)).toBe(0);
  });

  it("изменение количества: ограничение остатком, 0 — удалить", async () => {
    const cart = await createGuestCart();
    const p = await makeProduct({ stock: 4 });
    await addToCart(cart, p, 1);
    expect(await updateCartQuantity(cart, p, 10)).toBe(4);
    expect(await updateCartQuantity(cart, p, 0)).toBe(0);
    expect(await cartLines(cart)).toEqual([]);
    await expect(updateCartQuantity(cart, p, -1)).rejects.toThrow(CartError);
  });

  it("позиции по алфавиту, со стоимостью; скрытые товары не показываются и не считаются", async () => {
    const cart = await createGuestCart();
    const b = await makeProduct({ name: "Яблоко", price: 1000 });
    const a = await makeProduct({ name: "Арбуз", price: 2500 });
    const h = await makeProduct({ name: "Банан" });
    await addToCart(cart, b, 2);
    await addToCart(cart, a, 1);
    await addToCart(cart, h, 1);
    await prisma.product.update({ where: { id: h.id }, data: { isActive: false } });
    const lines = await cartLines(cart);
    expect(lines.map((l) => [l.product.name, l.quantity, l.total])).toEqual([["Арбуз", 1, 2500], ["Яблоко", 2, 2000]]);
    expect(await cartCount(cart)).toBe(3);
    await removeFromCart(cart, b.id);
    expect(await cartCount(cart)).toBe(1);
    await clearCart(cart);
    expect(await cartCount(cart)).toBe(0);
  });

  it("корзину пользователя нельзя взять по id из куки гостя", async () => {
    const user = await makeUser();
    const own = await userCartId(user.id);
    expect(await userCartId(user.id)).toBe(own);
    expect(await findGuestCart(own)).toBeNull();
    const guest = await createGuestCart();
    expect(await findGuestCart(guest)).toBe(guest);
    expect(await findGuestCart("not-a-uuid")).toBeNull();
    expect(await findGuestCart(undefined)).toBeNull();
    expect(await cartLines(null)).toEqual([]);
  });

  it("при входе корзина гостя сливается: количества суммируются в пределах остатка", async () => {
    const user = await makeUser();
    const both = await makeProduct({ stock: 3 });
    const guestOnly = await makeProduct({ stock: 5 });
    const hidden = await makeProduct({ stock: 5 });
    const own = await userCartId(user.id);
    await addToCart(own, both, 2);
    const guest = await createGuestCart();
    await addToCart(guest, both, 2);
    await addToCart(guest, guestOnly, 1);
    await addToCart(guest, hidden, 1);
    await prisma.product.update({ where: { id: hidden.id }, data: { isActive: false } });

    await mergeGuestCart(guest, user.id);
    const lines = await prisma.cartItem.findMany({ where: { cartId: own }, orderBy: { productId: "asc" } });
    expect(lines.map((l) => [l.productId, l.quantity])).toEqual([[both.id, 3], [guestOnly.id, 1]]);
    expect(await prisma.cart.findUnique({ where: { id: guest } })).toBeNull();
    // Повторное слияние той же (уже удалённой) корзины ничего не меняет.
    await mergeGuestCart(guest, user.id);
    expect(await cartCount(own)).toBe(4);
  });
});
