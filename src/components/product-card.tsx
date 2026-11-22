import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { addToCartAction } from "@/app/actions/cart";
import type { Category, Product } from "@/generated/prisma/client";
import { rub } from "@/lib/format";
import { MediaImage } from "./media-image";
import { SubmitButton } from "./submit-button";

export function StockText({ stock, testId }: { stock: number; testId?: string }) {
  return stock > 0 ? (
    <span className="text-green-700" data-testid={testId}>
      В наличии: {stock} шт.
    </span>
  ) : (
    <span className="text-red-600" data-testid={testId}>
      Нет в наличии
    </span>
  );
}

export function ProductCard({ product }: { product: Product & { category: Category } }) {
  const href = `/products/${product.slug}`;
  return (
    <article
      className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs"
      data-testid="product-card"
    >
      <Link href={href} tabIndex={-1} aria-hidden className="block aspect-[4/3] overflow-hidden bg-neutral-100">
        <MediaImage path={product.image} alt="" size={400} className="size-full" />
      </Link>
      <div className="flex flex-1 flex-col p-2.5 sm:p-3">
        <p className="text-[11px] text-neutral-500 sm:text-xs">{product.category.name}</p>
        <h2 className="mt-0.5 text-sm leading-snug font-medium">
          <Link href={href} className="hover:underline">
            {product.name}
          </Link>
        </h2>
        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="font-semibold">{rub(product.price)}</span>
            <span className="text-[11px] sm:text-xs">
              <StockText stock={product.stock} />
            </span>
          </div>
          <form action={addToCartAction.bind(null, product.id)} className="mt-2">
            <SubmitButton size="sm" className="w-full" disabled={product.stock < 1}>
              <ShoppingCart aria-hidden /> В корзину
            </SubmitButton>
          </form>
        </div>
      </div>
    </article>
  );
}
