"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Пункт меню с подсветкой текущего раздела. */
export function NavLink({
  href,
  match,
  className,
  children,
  testId,
}: {
  href: string;
  match: (pathname: string) => boolean;
  className?: string;
  children: React.ReactNode;
  testId?: string;
}) {
  const pathname = usePathname();
  const active = match(pathname);
  return (
    <Link
      href={href}
      data-testid={testId}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
        active && "bg-neutral-100 font-medium text-neutral-900",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export const isCatalogPath = (p: string) => p === "/" || p.startsWith("/catalog") || p.startsWith("/products");
export const isOrdersPath = (p: string) => p.startsWith("/orders");
export const isCartPath = (p: string) => p.startsWith("/cart");
