import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Пагинация ссылками: текущие параметры фильтров сохраняются. */
export function Pagination({
  page,
  pages,
  pathname,
  params,
}: {
  page: number;
  pages: number;
  pathname: string;
  params: Record<string, string | undefined>;
}) {
  if (pages <= 1) {
    return null;
  }
  const href = (n: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) {
        sp.set(k, v);
      }
    }
    if (n > 1) {
      sp.set("page", String(n));
    } else {
      sp.delete("page");
    }
    const q = sp.toString();
    return q ? `${pathname}?${q}` : pathname;
  };
  const base = "inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md border bg-white px-2.5 text-sm";
  return (
    <nav aria-label="Страницы" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} className={cn(base, "hover:bg-neutral-100")} rel="prev">
          <ArrowLeft className="size-3.5" aria-hidden /> Назад
        </Link>
      ) : (
        <span className={cn(base, "text-neutral-400")} aria-disabled="true">
          <ArrowLeft className="size-3.5" aria-hidden /> Назад
        </span>
      )}
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) =>
        n === page ? (
          <span key={n} aria-current="page" className={cn(base, "border-neutral-900 bg-neutral-900 text-white")}>
            {n}
          </span>
        ) : (
          <Link key={n} href={href(n)} className={cn(base, "hover:bg-neutral-100")}>
            {n}
          </Link>
        ),
      )}
      {page < pages ? (
        <Link href={href(page + 1)} className={cn(base, "hover:bg-neutral-100")} rel="next">
          Вперёд <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      ) : (
        <span className={cn(base, "text-neutral-400")} aria-disabled="true">
          Вперёд <ArrowRight className="size-3.5" aria-hidden />
        </span>
      )}
    </nav>
  );
}
