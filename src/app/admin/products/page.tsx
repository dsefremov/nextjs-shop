import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { MediaImage } from "@/components/media-image";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ADMIN_PRODUCT_SORTS, parseAdminProductFilters } from "@/lib/filters";
import { formatDateTime, pluralRu, rub } from "@/lib/format";
import { listAdminCategories, listAdminProducts } from "@/server/admin";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Товары" };

export default async function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireStaff("/admin/products");
  const filters = parseAdminProductFilters(await searchParams);
  const [result, categories] = await Promise.all([listAdminProducts(filters), listAdminCategories()]);
  const keep = {
    q: filters.q,
    category: filters.categoryId?.toString(),
    stock: filters.stock,
    active: filters.active,
    sort: filters.sort === "name" ? undefined : filters.sort,
  };
  return (
    <div>
      <AdminPageHeader title="Товары" addHref="/admin/products/new" addLabel="Добавить товар" />
      <Form
        action="/admin/products"
        className="mb-4 grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-3 lg:items-end"
      >
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label htmlFor="q">Поиск</Label>
          <Input id="q" name="q" type="search" defaultValue={filters.q ?? ""} placeholder="Название или адрес" data-testid="admin-search" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="category">Категория</Label>
          <NativeSelect id="category" name="category" defaultValue={keep.category ?? ""} className="w-full">
            <NativeSelectOption value="">Все</NativeSelectOption>
            {categories.map((c) => (
              <NativeSelectOption key={c.id} value={c.id}>
                {c.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stock">Наличие</Label>
          <NativeSelect id="stock" name="stock" defaultValue={filters.stock ?? ""} className="w-full">
            <NativeSelectOption value="">Все</NativeSelectOption>
            <NativeSelectOption value="in">В наличии</NativeSelectOption>
            <NativeSelectOption value="out">Нет в наличии</NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="active">В каталоге</Label>
          <NativeSelect id="active" name="active" defaultValue={filters.active ?? ""} className="w-full">
            <NativeSelectOption value="">Все</NativeSelectOption>
            <NativeSelectOption value="1">Показывается</NativeSelectOption>
            <NativeSelectOption value="0">Скрыт</NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sort">Сортировка</Label>
          <NativeSelect id="sort" name="sort" defaultValue={filters.sort} className="w-full">
            {ADMIN_PRODUCT_SORTS.map((s) => (
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
            <Link href="/admin/products">Сбросить</Link>
          </Button>
        </div>
      </Form>
      <p className="mb-3 text-sm text-neutral-500" data-testid="admin-count">
        Найдено: {result.total} {pluralRu(result.total, ["товар", "товара", "товаров"])}
      </p>
      <div className="rounded-xl border border-neutral-200 bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Фото</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Категория</TableHead>
              <TableHead className="text-right">Цена</TableHead>
              <TableHead className="text-right">Остаток</TableHead>
              <TableHead>В каталоге</TableHead>
              <TableHead>Добавлен</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.map((p) => (
              <TableRow key={p.id} data-testid="admin-row">
                <TableCell>
                  <MediaImage path={p.image} alt="" size={40} className="size-10 rounded-md" />
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/admin/products/${p.id}`} className="hover:underline">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>{p.category.name}</TableCell>
                <TableCell className="text-right">{rub(p.price)}</TableCell>
                <TableCell className={p.stock > 0 ? "text-right" : "text-right text-red-600"}>{p.stock}</TableCell>
                <TableCell>{p.isActive ? "Да" : <span className="text-neutral-400">Скрыт</span>}</TableCell>
                <TableCell className="text-neutral-500">{formatDateTime(p.createdAt)}</TableCell>
              </TableRow>
            ))}
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-neutral-500">
                  Ничего не найдено.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <Pagination page={result.page} pages={result.pages} pathname="/admin/products" params={keep} />
    </div>
  );
}
