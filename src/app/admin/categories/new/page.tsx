import type { Metadata } from "next";
import Link from "next/link";
import { saveCategoryAction } from "@/app/actions/admin";
import { requireStaff } from "@/server/session";
import { CategoryForm } from "../category-form";

export const metadata: Metadata = { title: "Новая категория" };

export default async function NewCategoryPage() {
  await requireStaff("/admin/categories/new");
  return (
    <div>
      <Link href="/admin/categories" className="text-sm text-neutral-500 hover:underline">
        ← Категории
      </Link>
      <h1 className="mt-2 mb-4">Новая категория</h1>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
        <CategoryForm
          action={saveCategoryAction.bind(null, null)}
          initial={{ name: "", slug: "", description: "", position: "100", image: null }}
        />
      </div>
    </div>
  );
}
