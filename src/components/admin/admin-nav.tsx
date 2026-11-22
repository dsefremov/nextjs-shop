"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderTree, Package, ReceiptText, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/admin/products", label: "Товары", icon: Package },
  { href: "/admin/categories", label: "Категории", icon: FolderTree },
  { href: "/admin/orders", label: "Заказы", icon: ReceiptText },
] as const;

export function AdminNav({ showUsers }: { showUsers: boolean }) {
  const pathname = usePathname();
  const items = showUsers ? [...ITEMS, { href: "/admin/users", label: "Пользователи", icon: Users } as const] : ITEMS;
  return (
    <nav aria-label="Разделы админки" className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100",
              active && "bg-neutral-900 text-white hover:bg-neutral-900",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
