import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setOrderStatusAction } from "@/app/actions/admin";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime, rub } from "@/lib/format";
import { ADMIN_ACTIONS, canTransition } from "@/lib/order-rules";
import { getOrderForAdmin } from "@/server/order-queries";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Заказ" };

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  const { id: raw } = await params;
  await requireStaff(`/admin/orders/${raw}`);
  const order = /^\d{1,9}$/.test(raw) ? await getOrderForAdmin(Number(raw)) : null;
  if (!order) {
    notFound();
  }
  const actions = ADMIN_ACTIONS.filter((a) => canTransition(order.status, a.status));
  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-neutral-500 hover:underline">
        ← Заказы
      </Link>
      <div className="mt-2 mb-4 flex flex-wrap items-center gap-3">
        <h1>Заказ №{order.id}</h1>
        <StatusBadge status={order.status} />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section className="rounded-xl border border-neutral-200 bg-white shadow-xs">
            <h2 className="border-b border-neutral-200 px-4 py-3 font-semibold">Позиции</h2>
            <ul className="divide-y divide-neutral-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <div>
                    <p>
                      {item.productId ? (
                        <Link href={`/admin/products/${item.productId}`} className="hover:underline">
                          {item.productName}
                        </Link>
                      ) : (
                        <>
                          {item.productName} <span className="text-xs text-neutral-400">(товар удалён)</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {rub(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-medium whitespace-nowrap">{rub(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t border-neutral-200 px-4 py-3 font-semibold">
              <span>Итого</span>
              <span data-testid="order-total">{rub(order.total)}</span>
            </div>
          </section>
          <section className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-xs sm:grid-cols-2">
            <div>
              <h2 className="mb-2 font-semibold">Покупатель</h2>
              <p>{order.customerName}</p>
              <p className="text-neutral-600">{order.customerEmail}</p>
              <p className="text-neutral-600">{order.customerPhone}</p>
              <p className="mt-1 text-xs text-neutral-400">Учётная запись: {order.user.email}</p>
            </div>
            <div>
              <h2 className="mb-2 font-semibold">Доставка</h2>
              <p className="text-neutral-600">{order.address}</p>
              {order.comment ? <p className="mt-2 text-neutral-600">Комментарий: {order.comment}</p> : null}
              <p className="mt-2 text-xs text-neutral-400">
                Оформлен: {formatDateTime(order.createdAt)}
                {order.paidAt ? ` · оплачен: ${formatDateTime(order.paidAt)}` : ""}
                {order.stockReturnedAt ? ` · остаток возвращён: ${formatDateTime(order.stockReturnedAt)}` : ""}
              </p>
            </div>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-xs">
            <h2 className="mb-2 font-semibold">Статус</h2>
            {actions.length > 0 ? (
              <form action={setOrderStatusAction.bind(null, order.id)} className="flex flex-col gap-2">
                {actions.map((a) => (
                  <SubmitButton
                    key={a.status}
                    name="status"
                    value={a.status}
                    variant={a.status === "cancelled" ? "destructive" : "outline"}
                    data-testid={`status-${a.status}`}
                  >
                    {a.label}
                  </SubmitButton>
                ))}
              </form>
            ) : (
              <p className="text-neutral-500">Заказ в конечном статусе — действий нет.</p>
            )}
            <p className="mt-3 text-xs text-neutral-500">
              Оплату ставит только платёжный шлюз. Отмена возвращает остаток на склад один раз.
            </p>
          </section>
          <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-xs">
            <h2 className="mb-2 font-semibold">История оплаты</h2>
            {order.paymentAttempts.length > 0 ? (
              <ol className="space-y-2">
                {order.paymentAttempts.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-2" data-testid="payment-attempt">
                    <div>
                      <p className={a.succeeded ? "text-green-700" : "text-red-700"}>{a.message}</p>
                      <p className="text-xs text-neutral-500">
                        {a.reference} · {rub(a.amount)}
                      </p>
                    </div>
                    <span className="text-xs whitespace-nowrap text-neutral-500">{formatDateTime(a.createdAt)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-neutral-500">Попыток оплаты не было.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
