import type { Metadata } from "next";
import Link from "next/link";
import { saveProductAction } from "@/app/actions/admin";
import { listAdminCategories } from "@/server/admin";
import { requireStaff } from "@/server/session";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Новый товар" };

export default async function NewProductPage() {
  await requireStaff("/admin/products/new");
  const categories = await listAdminCategories();
  return (
    <div>
      <Link href="/admin/products" className="text-sm text-neutral-500 hover:underline">
        ← Товары
      </Link>
      <h1 className="mt-2 mb-4">Новый товар</h1>
      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs sm:p-5">
        <ProductForm
          action={saveProductAction.bind(null, null)}
          categories={categories}
          initial={{ name: "", slug: "", categoryId: "", description: "", price: "", stock: "0", isActive: true, image: null }}
        />
      </div>
    </div>
  );
}
