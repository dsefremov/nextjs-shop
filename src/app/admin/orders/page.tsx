import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { DateField } from "@/components/date-filters";
import { Pagination } from "@/components/pagination";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ORDER_SORTS, parseOrderFilters } from "@/lib/filters";
import { formatDateTime, pluralRu, rub } from "@/lib/format";
import { ORDER_STATUSES, STATUS_LABELS } from "@/lib/order-rules";
import { listAdminOrders } from "@/server/order-queries";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Заказы" };

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireStaff("/admin/orders");
  const filters = parseOrderFilters(await searchParams);
  const result = await listAdminOrders(filters);
  const keep = {
    q: filters.q,
    status: filters.status,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    sort: filters.sort === "-created" ? undefined : filters.sort,
  };
  return (
    <div>
      <AdminPageHeader title="Заказы" />
      <Form
        action="/admin/orders"
        className="mb-4 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-3 lg:items-end"
      >
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="q">Поиск</Label>
          <Input id="q" name="q" type="search" defaultValue={filters.q ?? ""} placeholder="№, покупатель или товар" data-testid="admin-search" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Статус</Label>
          <NativeSelect id="status" name="status" defaultValue={filters.status ?? ""} className="w-full">
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
          <NativeSelect id="sort" name="sort" defaultValue={filters.sort} className="w-full">
            {ORDER_SORTS.map((s) => (
              <NativeSelectOption key={s.value} value={s.value}>
                {s.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <Button type="submit" className="flex-1">
            Применить
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link href="/admin/orders">Сбросить</Link>
          </Button>
        </div>
      </Form>
      <p className="mb-3 text-sm text-neutral-500" data-testid="admin-count">
        Найдено: {result.total} {pluralRu(result.total, ["заказ", "заказа", "заказов"])}
      </p>
      <div className="rounded-xl border border-neutral-200 bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Заказ</TableHead>
              <TableHead>Оформлен</TableHead>
              <TableHead>Покупатель</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead>Оплачен</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((o) => (
              <TableRow key={o.id} data-testid="admin-row">
                <TableCell className="font-medium">
                  <Link href={`/admin/orders/${o.id}`} className="hover:underline">
                    Заказ №{o.id}
                  </Link>
                </TableCell>
                <TableCell>{formatDateTime(o.createdAt)}</TableCell>
                <TableCell>
                  <div>{o.customerName}</div>
                  <div className="text-xs text-neutral-500">{o.customerEmail}</div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={o.status} />
                </TableCell>
                <TableCell className="text-right">{rub(o.total)}</TableCell>
                <TableCell className="text-neutral-500">{o.paidAt ? formatDateTime(o.paidAt) : "—"}</TableCell>
              </TableRow>
            ))}
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-neutral-500">
                  Ничего не найдено.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <Pagination page={result.page} pages={result.pages} pathname="/admin/orders" params={keep} />
    </div>
  );
}
