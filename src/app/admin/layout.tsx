import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Store } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { FlashMessage } from "@/components/flash-message";
import { Button } from "@/components/ui/button";
import { readFlash } from "@/server/flash";
import { requireStaff } from "@/server/session";

export const metadata: Metadata = { title: { default: "Админка", template: "%s — Админка Next.js Shop" } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff("/admin");
  const flash = await readFlash();
  return (
    <>
      <header className="bg-neutral-900 text-neutral-100">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-white text-neutral-900" aria-hidden>
              <Store className="size-4" />
            </span>
            Next.js Shop <span className="font-normal text-neutral-400">· админка</span>
          </Link>
          <div className="ml-auto flex items-center gap-1 text-sm">
            <span className="hidden text-neutral-400 sm:inline">
              {user.name} · {user.role === "admin" ? "администратор" : "менеджер"}
            </span>
            <Button asChild variant="ghost" size="sm" className="text-neutral-100 hover:bg-neutral-800 hover:text-white">
              <Link href="/">
                <ExternalLink aria-hidden /> Сайт
              </Link>
            </Button>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm" className="text-neutral-100 hover:bg-neutral-800 hover:text-white">
                Выйти
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)]">
        <aside>
          <AdminNav showUsers={user.role === "admin"} />
        </aside>
        <main className="min-w-0">
          <FlashMessage flash={flash} />
          {children}
        </main>
      </div>
    </>
  );
}
