import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { rub } from "@/lib/format";
import { cartLines } from "@/server/cart";
import { currentCartId } from "@/server/cart-session";
import { requireUser } from "@/server/session";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Оформление заказа" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const lines = await cartLines(await currentCartId());
  if (lines.length === 0) {
    redirect("/cart");
  }
  const total = lines.reduce((sum, l) => sum + l.total, 0);
  return (
    <div>
      <h1 className="mb-6">Оформление заказа</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
          <h2 className="mb-4 font-semibold">Получатель и доставка</h2>
          <CheckoutForm
            initial={{ customerName: user.name, customerEmail: user.email, customerPhone: "", address: "", comment: "" }}
          />
        </section>
        <aside className="h-fit rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
          <h2 className="mb-3 font-semibold">Ваш заказ</h2>
          <ul className="divide-y divide-neutral-100 text-sm">
            {lines.map((l) => (
              <li key={l.product.id} className="flex justify-between gap-3 py-2">
                <span>
                  {l.product.name} <span className="whitespace-nowrap text-neutral-400">× {l.quantity}</span>
                </span>
                <span className="whitespace-nowrap">{rub(l.total)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3">
            <span className="text-sm text-neutral-600">Итого</span>
            <span className="text-lg font-semibold" data-testid="checkout-total">
              {rub(total)}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

