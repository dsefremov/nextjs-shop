import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteProductAction, saveProductAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";
import { kopecksToInput } from "@/lib/money";
import { listAdminCategories } from "@/server/admin";
import { prisma } from "@/server/db";
import { requireStaff } from "@/server/session";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Товар" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const { id: raw } = await params;
  await requireStaff(`/admin/products/${raw}`);
  const id = /^\d{1,9}$/.test(raw) ? Number(raw) : null;
  const product = id === null ? null : await prisma.product.findUnique({ where: { id } });
  if (!product) {
    notFound();
  }
  const categories = await listAdminCategories();
  return (
    <div>
      <Link href="/admin/products" className="text-sm text-neutral-500 hover:underline">
        ← Товары
      </Link>
      <div className="mt-2 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1>{product.name}</h1>
        <Link href={`/products/${product.slug}`} className="text-sm text-neutral-600 hover:underline">
          Открыть на сайте
        </Link>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
        <ProductForm
          action={saveProductAction.bind(null, product.id)}
          categories={categories}
          initial={{
            name: product.name,
            slug: product.slug,
            categoryId: String(product.categoryId),
            description: product.description,
            price: kopecksToInput(product.price),
            stock: String(product.stock),
            isActive: product.isActive,
            image: product.image,
          }}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
        <span>
          Добавлен: {formatDateTime(product.createdAt)} · изменён: {formatDateTime(product.updatedAt)}
        </span>
        <form action={deleteProductAction.bind(null, product.id)}>
          <SubmitButton variant="destructive" size="sm">
            Удалить товар
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
