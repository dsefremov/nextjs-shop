import Link from "next/link";
import { ShoppingCart, Store } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { cartCount } from "@/server/cart";
import { currentCartId } from "@/server/cart-session";
import { getCurrentUser, isStaff } from "@/server/session";
import { isCartPath, isCatalogPath, isOrdersPath, NavLink } from "./nav-link";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const count = await cartCount(await currentCartId());
  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="container-page flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-neutral-900 text-white" aria-hidden>
            <Store className="size-4" />
          </span>
          Next.js Shop
        </Link>
        <nav aria-label="Основное меню" className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto">
          <NavLink href="/" match={isCatalogPath}>
            Каталог
          </NavLink>
          <NavLink href="/orders" match={isOrdersPath}>
            Мои заказы
          </NavLink>
          {isStaff(user) ? (
            <NavLink href="/admin" match={() => false}>
              Админка
            </NavLink>
          ) : null}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <NavLink href="/cart" match={isCartPath} testId="cart-link">
            <ShoppingCart className="size-4" aria-hidden />
            <span className="sr-only sm:not-sr-only">Корзина</span>
            {count > 0 ? (
              <span
                className="grid min-w-5 place-items-center rounded-full bg-neutral-900 px-1.5 text-xs font-medium text-white"
                data-testid="cart-count"
              >
                {count}
              </span>
            ) : null}
          </NavLink>
          {user ? (
            <>
              <Button asChild variant="outline" size="sm" className="hidden max-w-40 sm:inline-flex">
                <Link href="/account" data-testid="user-menu">
                  <span className="truncate">{user.name}</span>
                </Link>
              </Button>
              <form action={logout}>
                <Button type="submit" variant="ghost" size="sm" className="text-neutral-600">
                  Выйти
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button asChild variant="outline" size="sm">
                <Link href="/login">Войти</Link>
              </Button>
              <Button asChild size="sm" className="hidden sm:inline-flex">
                <Link href="/register">Регистрация</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
