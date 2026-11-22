"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canCustomerCancel } from "@/lib/order-rules";
import { cartLines, clearCart } from "@/server/cart";
import { currentCartId } from "@/server/cart-session";
import { prisma } from "@/server/db";
import { flash } from "@/server/flash";
import { cancelOrder, OrderError, pay, placeOrder } from "@/server/orders";
import { requireUser } from "@/server/session";

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, "Укажите имя и фамилию.").max(150, "Не длиннее 150 символов."),
  customerEmail: z.email("Укажите корректную эл. почту.").max(254),
  customerPhone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{6,32}$/, "Телефон: цифры, пробелы, скобки и дефисы, от 6 символов."),
  address: z.string().trim().min(5, "Укажите адрес доставки.").max(255, "Не длиннее 255 символов."),
  comment: z.string().trim().max(1000, "Не длиннее 1000 символов."),
});

export type CheckoutValues = z.input<typeof checkoutSchema>;
export interface CheckoutState {
  values: CheckoutValues;
  errors: Partial<Record<keyof CheckoutValues | "form", string>>;
}

export async function checkoutAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const user = await requireUser("/checkout");
  const values: CheckoutValues = {
    customerName: String(formData.get("customerName") ?? ""),
    customerEmail: String(formData.get("customerEmail") ?? ""),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    address: String(formData.get("address") ?? ""),
    comment: String(formData.get("comment") ?? ""),
  };
  const parsed = checkoutSchema.safeParse(values);
  if (!parsed.success) {
    const errors: CheckoutState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof CheckoutValues;
      errors[key] ??= issue.message;
    }
    return { values, errors };
  }
  const cartId = await currentCartId();
  const lines = await cartLines(cartId);
  if (!cartId || lines.length === 0) {
    await flash("info", "Корзина пуста — добавьте товары из каталога.");
    redirect("/cart");
  }
  let orderId: number;
  try {
    const order = await placeOrder(
      user.id,
      lines.map((l) => [l.product.id, l.quantity] as const),
      parsed.data,
    );
    orderId = order.id;
  } catch (error) {
    if (error instanceof OrderError) {
      return { values, errors: { form: error.message } };
    }
    throw error;
  }
  await clearCart(cartId);
  await flash("success", `Заказ №${orderId} оформлен. Оплатите его на этой странице.`);
  revalidatePath("/", "layout");
  redirect(`/orders/${orderId}`);
}

async function ownOrder(orderId: number) {
  const user = await requireUser(`/orders/${orderId}`);
  const order = Number.isInteger(orderId)
    ? await prisma.order.findFirst({ where: { id: orderId, userId: user.id } })
    : null;
  if (!order) {
    await flash("error", "Заказ не найден.");
    redirect("/orders");
  }
  return order;
}

export async function payOrderAction(orderId: number, formData: FormData): Promise<void> {
  const order = await ownOrder(orderId);
  const decision = formData.get("decision");
  if (decision !== "pay" && decision !== "decline") {
    await flash("error", "Неизвестное действие оплаты.");
  } else {
    try {
      const { result } = await pay(order.id, { approve: decision === "pay" });
      await (result.succeeded
        ? flash("success", "Оплата прошла успешно.")
        : flash("error", "Оплата отклонена. Можно попробовать ещё раз."));
    } catch (error) {
      if (!(error instanceof OrderError)) {
        throw error;
      }
      await flash("error", error.message);
    }
  }
  revalidatePath(`/orders/${order.id}`);
}

export async function cancelOrderAction(orderId: number): Promise<void> {
  const order = await ownOrder(orderId);
  if (!canCustomerCancel(order.status)) {
    await flash("error", "Этот заказ уже нельзя отменить.");
  } else {
    try {
      await cancelOrder(order.id);
      await flash("success", `Заказ №${order.id} отменён, товар вернулся на склад.`);
    } catch (error) {
      if (!(error instanceof OrderError)) {
        throw error;
      }
      await flash("error", error.message);
    }
  }
  revalidatePath(`/orders/${order.id}`);
}
