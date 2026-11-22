import Form from "next/form";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelectOption } from "@/components/ui/native-select";
import { CATALOG_SORTS, type CatalogFilters } from "@/lib/filters";
import { pluralRu } from "@/lib/format";
import { cn } from "@/lib/utils";
import { categoriesWithCounts, listProducts, priceRange } from "@/server/catalog";
import { AutoSubmitSelect } from "./auto-submit-select";
import { Pagination } from "./pagination";
import { ProductCard } from "./product-card";

const rubles = (kopecks?: number) => (kopecks === undefined ? "" : String(kopecks / 100));

export async function CatalogView({
  filters,
  category,
}: {
  filters: CatalogFilters;
  category?: { id: number; name: string; slug: string; description: string };
}) {
  const [categories, result, range] = await Promise.all([
    categoriesWithCounts(),
    listProducts(filters, category?.id),
    priceRange(),
  ]);
  const pathname = category ? `/catalog/${category.slug}` : "/";
  const totalActive = categories.reduce((sum, c) => sum + c.productCount, 0);
  const keep = {
    q: filters.q,
    price_min: rubles(filters.priceMin) || undefined,
    price_max: rubles(filters.priceMax) || undefined,
    in_stock: filters.inStock ? "1" : undefined,
    sort: filters.sort === "name" ? undefined : filters.sort,
  };
  const categoryLink = (slug?: string) => {
    const sp = new URLSearchParams(Object.entries(keep).filter((e): e is [string, string] => Boolean(e[1])));
    const q = sp.toString();
    return `${slug ? `/catalog/${slug}` : "/"}${q ? `?${q}` : ""}`;
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="min-w-0 space-y-4">
        <div>
          <h2 className="mb-2 text-sm font-semibold">Категории</h2>
          <nav aria-label="Категории" className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
            {[{ slug: undefined, name: "Все товары", productCount: totalActive }, ...categories].map((c) => {
              const active = c.slug === category?.slug;
              return (
                <Link
                  key={c.slug ?? "all"}
                  href={categoryLink(c.slug)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex shrink-0 items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-sm whitespace-nowrap hover:bg-neutral-100",
                    active && "bg-neutral-200/70 font-medium",
                  )}
                >
                  {c.name}
                  <span className="text-xs text-neutral-400">{c.productCount}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        <Form action={pathname} className="space-y-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-xs">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal className="size-4" aria-hidden /> Фильтр
          </h2>
          {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
          {keep.sort ? <input type="hidden" name="sort" value={keep.sort} /> : null}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="price_min" className="text-xs font-normal text-neutral-600">
                Цена от, ₽
              </Label>
              <Input
                id="price_min"
                name="price_min"
                inputMode="decimal"
                defaultValue={rubles(filters.priceMin)}
                placeholder={range ? String(range.min / 100) : ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="price_max" className="text-xs font-normal text-neutral-600">
                до, ₽
              </Label>
              <Input
                id="price_max"
                name="price_max"
                inputMode="decimal"
                defaultValue={rubles(filters.priceMax)}
                placeholder={range ? String(range.max / 100) : ""}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="in_stock" name="in_stock" value="1" defaultChecked={filters.inStock} />
            <Label htmlFor="in_stock" className="font-normal">
              Только в наличии
            </Label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" className="flex-1">
              Применить
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link href={pathname}>Сбросить</Link>
            </Button>
          </div>
        </Form>
      </aside>

      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1>{category?.name ?? "Каталог"}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              {category?.description || "Все товары магазина. Цены указаны в рублях."}
            </p>
          </div>
          <p className="text-sm text-neutral-500" data-testid="catalog-count">
            Найдено: {result.total} {pluralRu(result.total, ["товар", "товара", "товаров"])}
          </p>
        </div>
        <Form action={pathname} className="mb-4 flex flex-wrap gap-2">
          {keep.price_min ? <input type="hidden" name="price_min" value={keep.price_min} /> : null}
          {keep.price_max ? <input type="hidden" name="price_max" value={keep.price_max} /> : null}
          {filters.inStock ? <input type="hidden" name="in_stock" value="1" /> : null}
          <div className="relative min-w-0 flex-[1_1_16rem]">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-neutral-400" aria-hidden />
            <Input
              type="search"
              name="q"
              defaultValue={filters.q ?? ""}
              placeholder="Поиск по названию и описанию"
              aria-label="Поиск"
              className="h-9 bg-white pl-8"
              data-testid="catalog-search"
            />
          </div>
          <AutoSubmitSelect
            name="sort"
            defaultValue={filters.sort}
            aria-label="Сортировка"
            data-testid="catalog-sort"
            className="flex-[1_1_9rem] sm:flex-none [&_select]:h-9 [&_select]:bg-white sm:[&_select]:w-44"
          >
            {CATALOG_SORTS.map((s) => (
              <NativeSelectOption key={s.value} value={s.value}>
                {s.label}
              </NativeSelectOption>
            ))}
          </AutoSubmitSelect>
          <Button type="submit" variant="outline" className="h-9 bg-white">
            Найти
          </Button>
        </Form>

        {result.items.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
            <p className="font-medium">Ничего не найдено</p>
            <p className="mt-1 text-sm text-neutral-500">Измените запрос или сбросьте фильтры.</p>
          </div>
        )}
        <Pagination page={result.page} pages={result.pages} pathname={pathname} params={keep} />
      </section>
    </div>
  );
}
