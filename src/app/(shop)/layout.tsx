import { FlashMessage } from "@/components/flash-message";
import { SiteHeader } from "@/components/site-header";
import { readFlash } from "@/server/flash";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const flash = await readFlash();
  return (
    <>
      <SiteHeader />
      <main className="container-page flex-1 py-6 sm:py-8">
        <FlashMessage flash={flash} />
        {children}
      </main>
      <footer className="border-t border-neutral-200 bg-white">
        <div className="container-page py-4 text-xs text-neutral-500">
          Next.js Shop — учебный магазин на Next.js 16, Prisma 7 и PostgreSQL 17. Оплата тестовая, деньги не списываются.
        </div>
      </footer>
    </>
  );
}
