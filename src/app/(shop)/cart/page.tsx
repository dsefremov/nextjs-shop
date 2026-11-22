import type { Metadata } from "next";
import Link from "next/link";
import { removeFromCartAction, updateCartAction } from "@/app/actions/cart";
import { MediaImage } from "@/components/media-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rub } from "@/lib/format";
import { cartLines } from "@/server/cart";
import { currentCartId } from "@/server/cart-session";
import { getCurrentUser } from "@/server/session";

export const metadata: Metadata = { title: "Корзина" };

export default async function CartPage() {
  const [lines, user] = await Promise.all([currentCartId().then(cartLines), getCurrentUser()]);
  const total = lines.reduce((sum, l) => sum + l.total, 0);
  const stockProblem = lines.some((l) => l.quantity > l.product.stock);
  return (
    <div>
      <h1 className="mb-6">Корзина</h1>
      {lines.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white shadow-xs">
            {lines.map((line) => {
              const href = `/products/${line.product.slug}`;
              return (
                <li key={line.product.id} className="flex gap-3 p-4" data-testid="cart-line">
                  <Link href={href} tabIndex={-1} aria-hidden className="size-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100 sm:size-20">
                    <MediaImage path={line.product.image} alt="" size={80} className="size-full" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <div className="min-w-0">
                        <Link href={href} className="text-sm font-medium hover:underline">
                          {line.product.name}
                        </Link>
                        <p className="text-xs text-neutral-500">
                          {rub(line.product.price)} за шт. · в наличии {line.product.stock} шт.
                        </p>
                        {line.quantity > line.product.stock ? (
                          <p className="mt-1 text-xs text-red-600">
                            Доступно только {line.product.stock} шт. — уменьшите количество.
                          </p>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold whitespace-nowrap">{rub(line.total)}</p>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <form action={updateCartAction.bind(null, line.product.id)} className="flex items-center gap-2">
                        <label className="sr-only" htmlFor={`qty-${line.product.id}`}>
                          Количество: {line.product.name}
                        </label>
                        <Input
                          id={`qty-${line.product.id}`}
                          name="quantity"
                          type="number"
                          min={0}
                          max={line.product.stock}
                          defaultValue={line.quantity}
                          className="w-20"
                        />
                        <span className="sr-only" data-testid="cart-qty">
                          {line.quantity}
                        </span>
                        <Button type="submit" variant="outline" size="sm">
                          Обновить
                        </Button>
                      </form>
                      <form action={removeFromCartAction.bind(null, line.product.id)}>
                        <Button type="submit" variant="ghost" size="sm" className="text-neutral-500" aria-label={`Удалить: ${line.product.name}`}>
                          Удалить
                        </Button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <aside className="h-fit space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600">Итого</span>
              <span className="text-lg font-semibold" data-testid="cart-total">
                {rub(total)}
              </span>
            </div>
            {stockProblem ? (
              <>
                <p className="text-sm text-red-600">Часть товаров закончилась — исправьте количество.</p>
                <Button className="w-full" disabled>
                  Оформить заказ
                </Button>
              </>
            ) : (
              <Button asChild className="w-full">
                <Link href="/checkout">Оформить заказ</Link>
              </Button>
            )}
            {!user ? <p className="text-xs text-neutral-500">Для оформления нужно войти — корзина сохранится.</p> : null}
          </aside>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
          <p className="font-medium">Корзина пуста</p>
          <p className="mt-1 text-sm text-neutral-500">Добавьте товары из каталога.</p>
          <Button asChild className="mt-4">
            <Link href="/">В каталог</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
