import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { addToCartAction } from "@/app/actions/cart";
import { MediaImage } from "@/components/media-image";
import { StockText } from "@/components/product-card";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { rub } from "@/lib/format";
import { getActiveProductBySlug } from "@/server/catalog";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const product = await getActiveProductBySlug((await params).slug);
  return { title: product?.name ?? "Товар не найден" };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const product = await getActiveProductBySlug((await params).slug);
  if (!product) {
    notFound();
  }
  return (
    <div>
      <nav aria-label="Навигация" className="mb-4 flex flex-wrap gap-1 text-sm text-neutral-500">
        <Link href="/" className="hover:underline">
          Каталог
        </Link>
        <span aria-hidden>/</span>
        <Link href={`/catalog/${product.category.slug}`} className="hover:underline">
          {product.category.name}
        </Link>
      </nav>
      <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <MediaImage path={product.image} alt={product.name} size={800} className="aspect-square w-full" priority />
        </div>
        <div>
          <p className="text-sm text-neutral-500">{product.category.name}</p>
          <h1 className="mt-1">{product.name}</h1>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-3xl font-semibold" data-testid="product-price">
              {rub(product.price)}
            </span>
            <span className="text-sm">
              <StockText stock={product.stock} testId="product-stock" />
            </span>
          </div>
          {product.stock > 0 ? (
            <form action={addToCartAction.bind(null, product.id)} className="mt-6 flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Количество</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  max={product.stock}
                  defaultValue={1}
                  required
                  className="h-10 w-24 bg-white"
                />
              </div>
              <SubmitButton className="h-10 px-5" data-testid="add-to-cart">
                <ShoppingCart aria-hidden /> В корзину
              </SubmitButton>
            </form>
          ) : (
            <p className="mt-6 rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-600">
              Товар закончился — загляните позже.
            </p>
          )}
          <div className="mt-8 border-t border-neutral-200 pt-6">
            <h2 className="mb-2 font-semibold">Описание</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-neutral-700">{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
