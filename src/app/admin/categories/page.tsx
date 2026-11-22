import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-header";
import { MediaImage } from "@/components/media-image";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listAdminCategories } from "@/server/admin";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: "Категории" };

export default async function AdminCategoriesPage() {
  await requireStaff("/admin/categories");
  const categories = await listAdminCategories();
  return (
    <div>
      <AdminPageHeader title="Категории" addHref="/admin/categories/new" addLabel="Добавить категорию" />
      <div className="rounded-xl border border-neutral-200 bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Фото</TableHead>
              <TableHead>Название</TableHead>
              <TableHead>Адрес</TableHead>
              <TableHead className="text-right">Порядок</TableHead>
              <TableHead className="text-right">Товаров</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id} data-testid="admin-row">
                <TableCell>
                  <MediaImage path={c.image} alt="" size={40} className="size-10 rounded-md" />
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/admin/categories/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="text-neutral-500">{c.slug}</TableCell>
                <TableCell className="text-right">{c.position}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/products?category=${c.id}`} className="hover:underline">
                    {c._count.products}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
