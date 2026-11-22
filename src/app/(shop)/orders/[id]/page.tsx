import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cancelOrderAction, payOrderAction } from "@/app/actions/orders";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime, rub } from "@/lib/format";
import { canCustomerCancel, isPayable } from "@/lib/order-rules";
import { getUserOrder } from "@/server/order-queries";
import { requireUser } from "@/server/session";

function orderId(raw: string): number | null {
  return /^\d{1,9}$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: PageProps<"/orders/[id]">): Promise<Metadata> {
  return { title: `Заказ №${(await params).id}` };
}

export default async function OrderPage({ params }: PageProps<"/orders/[id]">) {
  const { id: raw } = await params;
  const user = await requireUser(`/orders/${raw}`);
  const id = orderId(raw);
  const order = id === null ? null : await getUserOrder(user.id, id);
  if (!order) {
    notFound();
  }
  return (
    <div>
      <Link href="/orders" className="text-sm text-neutral-500 hover:underline">
        ← Мои заказы
      </Link>
      <div className="mt-2 mb-6 flex flex-wrap items-center gap-3">
        <h1>Заказ №{order.id}</h1>
        <StatusBadge status={order.status} />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-200 bg-white shadow-xs">
            <h2 className="border-b border-neutral-200 px-4 py-3 font-semibold">Товары</h2>
            <ul className="divide-y divide-neutral-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <div>
                    <p>{item.productName}</p>
                    <p className="text-xs text-neutral-500">
                      {rub(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-medium whitespace-nowrap">{rub(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-neutral-200 px-4 py-3">
              <span className="font-semibold">Итого</span>
              <span className="font-semibold" data-testid="order-total">
                {rub(order.total)}
              </span>
            </div>
          </section>
          <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-xs">
            <h2 className="mb-2 font-semibold">Получатель и доставка</h2>
            <p>{order.customerName}</p>
            <p className="text-neutral-600">
              {order.customerPhone} · {order.customerEmail}
            </p>
            <p className="text-neutral-600">{order.address}</p>
            {order.comment ? <p className="mt-2 text-neutral-600">Комментарий: {order.comment}</p> : null}
            <p className="mt-3 text-xs text-neutral-400">
              Оформлен: {formatDateTime(order.createdAt)}
              {order.paidAt ? ` · оплачен: ${formatDateTime(order.paidAt)}` : ""}
            </p>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-xs">
            <h2 className="mb-2 font-semibold">Оплата</h2>
            <p className="text-neutral-600">
              Способ оплаты: <span className="text-neutral-900">Тестовая оплата</span>
            </p>
            {order.status === "payment_declined" ? (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-red-800" data-testid="payment-declined">
                Последняя попытка оплаты отклонена. Товар зарезервирован — можно оплатить ещё раз.
              </p>
            ) : null}
            {isPayable(order.status) ? (
              <>
                <p className="mt-3 text-neutral-600">
                  Деньги не списываются: «Оплатить» — оплата пройдёт, «Отказ» — смоделировать отклонённый платёж.
                </p>
                <form action={payOrderAction.bind(null, order.id)} className="mt-3 flex gap-2">
                  <SubmitButton name="decision" value="pay" className="h-9 flex-1" data-testid="pay-button">
                    {order.status === "payment_declined" ? "Оплатить ещё раз" : "Оплатить"}
                  </SubmitButton>
                  <SubmitButton name="decision" value="decline" variant="outline" className="h-9" data-testid="decline-button">
                    Отказ
                  </SubmitButton>
                </form>
              </>
            ) : order.paidAt ? (
              <p className="mt-3 text-green-700">Заказ оплачен {formatDateTime(order.paidAt)}.</p>
            ) : null}
            {canCustomerCancel(order.status) ? (
              <form action={cancelOrderAction.bind(null, order.id)} className="mt-3 border-t border-neutral-100 pt-3">
                <SubmitButton variant="destructive" size="sm" className="w-full" data-testid="cancel-button">
                  Отменить заказ
                </SubmitButton>
              </form>
            ) : null}
          </section>
          {order.paymentAttempts.length > 0 ? (
            <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-xs">
              <h2 className="mb-2 font-semibold">История оплаты</h2>
              <ol className="space-y-2">
                {order.paymentAttempts.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-2" data-testid="payment-attempt">
                    <div>
                      <p className={a.succeeded ? "text-green-700" : "text-red-700"}>{a.succeeded ? "Успешно" : "Отказ"}</p>
                      <p className="text-xs text-neutral-500">{a.reference}</p>
                    </div>
                    <span className="text-xs whitespace-nowrap text-neutral-500">{formatDateTime(a.createdAt)}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
