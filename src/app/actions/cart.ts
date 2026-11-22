"use server";

import { revalidatePath } from "next/cache";
import { addToCart, CartError, removeFromCart, updateCartQuantity } from "@/server/cart";
import { ensureCartId } from "@/server/cart-session";
import { getActiveProduct } from "@/server/catalog";
import { prisma } from "@/server/db";
import { flash } from "@/server/flash";

function quantityFrom(formData: FormData, fallback: number): number {
  const raw = String(formData.get("quantity") ?? "").trim();
  return raw === "" ? fallback : /^-?\d{1,6}$/.test(raw) ? Number(raw) : Number.NaN;
}

export async function addToCartAction(productId: number, formData: FormData): Promise<void> {
  const product = Number.isInteger(productId) ? await getActiveProduct(productId) : null;
  if (!product) {
    await flash("error", "Товар не найден.");
  } else {
    try {
      await addToCart(await ensureCartId(), product, quantityFrom(formData, 1));
      await flash("success", `«${product.name}» добавлен в корзину.`);
    } catch (error) {
      if (!(error instanceof CartError)) {
        throw error;
      }
      await flash("error", error.message);
    }
  }
  revalidatePath("/", "layout");
}

export async function updateCartAction(productId: number, formData: FormData): Promise<void> {
  const product = Number.isInteger(productId) ? await prisma.product.findUnique({ where: { id: productId } }) : null;
  const quantity = quantityFrom(formData, -1);
  if (!product || Number.isNaN(quantity) || quantity < 0) {
    await flash("error", "Неверное количество.");
  } else {
    const result = await updateCartQuantity(await ensureCartId(), product, quantity);
    if (result < quantity) {
      await flash("warning", `Доступно только ${result} шт. «${product.name}».`);
    } else {
      await flash("success", "Корзина обновлена.");
    }
  }
  revalidatePath("/", "layout");
}

export async function removeFromCartAction(productId: number): Promise<void> {
  const product = Number.isInteger(productId) ? await prisma.product.findUnique({ where: { id: productId } }) : null;
  if (product) {
    await removeFromCart(await ensureCartId(), product.id);
    await flash("success", `«${product.name}» удалён из корзины.`);
  }
  revalidatePath("/", "layout");
}
