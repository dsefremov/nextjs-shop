/** Какая корзина у текущего запроса: у вошедшего — его корзина, у гостя — по httpOnly-куке cart_id. */
import "server-only";
import { cookies } from "next/headers";
import { createGuestCart, findGuestCart, userCartId } from "./cart";
import { prisma } from "./db";
import { getCurrentUser } from "./session";

export const CART_COOKIE = "cart_id";

/** Для рендера: только чтение (корзина не создаётся). */
export async function currentCartId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (user) {
    const cart = await prisma.cart.findUnique({ where: { userId: user.id }, select: { id: true } });
    return cart?.id ?? null;
  }
  return findGuestCart((await cookies()).get(CART_COOKIE)?.value);
}

/** Для server actions: корзина создаётся при первом добавлении, гостю ставится кука. */
export async function ensureCartId(): Promise<string> {
  const user = await getCurrentUser();
  if (user) {
    return userCartId(user.id);
  }
  const store = await cookies();
  const existing = await findGuestCart(store.get(CART_COOKIE)?.value);
  if (existing) {
    return existing;
  }
  const id = await createGuestCart();
  store.set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false,
  });
  return id;
}
