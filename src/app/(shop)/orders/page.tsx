import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { DateField } from "@/components/date-filters";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ORDER_SORTS, parseOrderFilters } from "@/lib/filters";
import { formatDateTime, pluralRu, rub } from "@/lib/format";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/order-rules";
import { listUserOrders } from "@/server/order-queries";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Мои заказы" };

export default async function OrdersPage({ searchParams }: PageProps<"/orders">) {
  const user = await requireUser("/orders");
  const filters = parseOrderFilters(await searchParams);
  const result = await listUserOrders(user.id, filters);
  const keep = {
    q: filters.q,
    status: filters.status,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    sort: filters.sort === "-created" ? undefined : filters.sort,
  };
  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <h1>Мои заказы</h1>
        <Link href="/account" className="text-sm text-neutral-600 hover:underline">
          Профиль
        </Link>
      </div>
      <Form
        action="/orders"
        className="mb-4 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1.2fr_auto] lg:items-end"
      >
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="q">Поиск</Label>
          <Input id="q" name="q" type="search" defaultValue={filters.q ?? ""} placeholder="№ заказа или товар" className="bg-white" data-testid="orders-search" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Статус</Label>
          <NativeSelect id="status" name="status" defaultValue={filters.status ?? ""} className="w-full [&_select]:bg-white">
            <NativeSelectOption value="">Все статусы</NativeSelectOption>
            {ORDER_STATUSES.map((s) => (
              <NativeSelectOption key={s} value={s}>
                {STATUS_LABELS[s]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <DateField id="date_from" label="С даты" value={filters.dateFrom} />
        <DateField id="date_to" label="По дату" value={filters.dateTo} />
        <div className="space-y-1.5">
          <Label htmlFor="sort">Сортировка</Label>
          <NativeSelect id="sort" name="sort" defaultValue={filters.sort} className="w-full [&_select]:bg-white" data-testid="orders-sort">
            {ORDER_SORTS.map((s) => (
              <NativeSelectOption key={s.value} value={s.value}>
                {s.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" className="sm:col-span-2 lg:col-span-1">
          Применить
        </Button>
      </Form>
      <p className="mb-3 text-sm text-neutral-500">
        Найдено: {result.total} {pluralRu(result.total, ["заказ", "заказа", "заказов"])}
      </p>
      {result.items.length > 0 ? (
        <ul className="space-y-3">
          {result.items.map((order) => (
            <li key={order.id} data-testid="order-row" className="relative rounded-xl border border-neutral-200 bg-white p-4 shadow-xs hover:border-neutral-300">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/orders/${order.id}`} className="font-medium after:absolute after:inset-0">
                      Заказ №{order.id}
                    </Link>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="mt-1 text-sm text-neutral-500">
                    {order.items.map((i) => `${i.productName} × ${i.quantity}`).join(", ")}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-semibold">{rub(order.total)}</p>
                  <p className="text-xs text-neutral-500">{formatDateTime(order.createdAt)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
          <p className="font-medium">Заказов не найдено</p>
          <p className="mt-1 text-sm text-neutral-500">Измените фильтры или загляните в каталог.</p>
        </div>
      )}
      <Pagination page={result.page} pages={result.pages} pathname="/orders" params={keep} />
    </div>
  );
}
