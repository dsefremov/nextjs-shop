import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCategoryAction, saveCategoryAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/submit-button";
import { prisma } from "@/server/db";
import { requireStaff } from "@/server/session";
import { CategoryForm } from "../category-form";

export const metadata: Metadata = { title: "Категория" };

export default async function EditCategoryPage({ params }: PageProps<"/admin/categories/[id]">) {
  const { id: raw } = await params;
  await requireStaff(`/admin/categories/${raw}`);
  const id = /^\d{1,9}$/.test(raw) ? Number(raw) : null;
  const category =
    id === null
      ? null
      : await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!category) {
    notFound();
  }
  return (
    <div>
      <Link href="/admin/categories" className="text-sm text-neutral-500 hover:underline">
        ← Категории
      </Link>
      <h1 className="mt-2 mb-4">{category.name}</h1>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
        <CategoryForm
          action={saveCategoryAction.bind(null, category.id)}
          initial={{
            name: category.name,
            slug: category.slug,
            description: category.description,
            position: String(category.position),
            image: category.image,
          }}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
        <span>Товаров в категории: {category._count.products}. Категорию с товарами удалить нельзя.</span>
        <form action={deleteCategoryAction.bind(null, category.id)}>
          <SubmitButton variant="destructive" size="sm">
            Удалить категорию
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
