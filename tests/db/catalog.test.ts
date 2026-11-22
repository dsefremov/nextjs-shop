import { describe, expect, it } from "vitest";
import { parseCatalogFilters } from "@/lib/filters";
import { CATALOG_PAGE_SIZE, categoriesWithCounts, getActiveProductBySlug, listProducts, priceRange } from "@/server/catalog";
import { prisma } from "@/server/db";
import { makeCategory, makeProduct } from "../support/factories";

const f = (params: Record<string, string> = {}) => parseCatalogFilters(params);

async function names(params: Record<string, string> = {}, categoryId?: number) {
  return (await listProducts(f(params), categoryId)).items.map((p) => p.name);
}

describe("каталог", () => {
  it("показывает только видимые товары, по названию", async () => {
    await makeProduct({ name: "Бета" });
    await makeProduct({ name: "Альфа" });
    await makeProduct({ name: "Скрытый", isActive: false });
    expect(await names()).toEqual(["Альфа", "Бета"]);
    expect((await getActiveProductBySlug("nope"))).toBeNull();
  });

  it("поиск по названию и описанию без учёта регистра", async () => {
    await makeProduct({ name: "Наушники Aero", description: "звук" });
    await makeProduct({ name: "Колонка", description: "Беспроводные НАУШНИКИ не входят" });
    await makeProduct({ name: "Чайник", description: "кухня" });
    expect(await names({ q: "наушники" })).toEqual(["Колонка", "Наушники Aero"]);
    expect(await names({ q: "AERO" })).toEqual(["Наушники Aero"]);
  });

  it("% и _ в поиске — обычные символы, а не шаблоны LIKE", async () => {
    await makeProduct({ name: "Скидка 50% на всё" });
    await makeProduct({ name: "Скидка 500 рублей" });
    await makeProduct({ name: "file_name" });
    await makeProduct({ name: "filename" });
    expect(await names({ q: "50%" })).toEqual(["Скидка 50% на всё"]);
    expect(await names({ q: "%" })).toEqual(["Скидка 50% на всё"]);
    expect(await names({ q: "file_" })).toEqual(["file_name"]);
  });

  it("цена от и до (в рублях), только в наличии", async () => {
    await makeProduct({ name: "Дешёвый", price: 50_000, stock: 1 });
    await makeProduct({ name: "Средний", price: 150_000, stock: 0 });
    await makeProduct({ name: "Дорогой", price: 500_000, stock: 2 });
    expect(await names({ price_min: "1000", price_max: "5000" })).toEqual(["Дорогой", "Средний"]);
    expect(await names({ price_max: "500" })).toEqual(["Дешёвый"]);
    expect(await names({ in_stock: "1" })).toEqual(["Дешёвый", "Дорогой"]);
    expect(await priceRange()).toEqual({ min: 50_000, max: 500_000 });
  });

  it("сортировки: цена ↑↓ и новизна", async () => {
    const now = Date.now();
    await makeProduct({ name: "B", price: 300, createdAt: new Date(now - 3000) });
    await makeProduct({ name: "A", price: 200, createdAt: new Date(now - 1000) });
    await makeProduct({ name: "C", price: 100, createdAt: new Date(now - 2000) });
    expect(await names({ sort: "price" })).toEqual(["C", "A", "B"]);
    expect(await names({ sort: "-price" })).toEqual(["B", "A", "C"]);
    expect(await names({ sort: "-created" })).toEqual(["A", "C", "B"]);
  });

  it("категория и счётчики видимых товаров", async () => {
    const one = await makeCategory("Первая");
    const two = await makeCategory("Вторая");
    await makeProduct({ name: "1a", categoryId: one.id });
    await makeProduct({ name: "1b", categoryId: one.id, isActive: false });
    await makeProduct({ name: "2a", categoryId: two.id });
    expect(await names({}, one.id)).toEqual(["1a"]);
    const counts = await categoriesWithCounts();
    expect(counts.map((c) => [c.name, c.productCount])).toEqual([["Первая", 1], ["Вторая", 1]]);
  });

  it("пагинация по 12; номер страницы за пределами — последняя", async () => {
    const category = await makeCategory();
    for (let i = 0; i < 14; i++) {
      await makeProduct({ name: `Товар ${String(i).padStart(2, "0")}`, categoryId: category.id });
    }
    const first = await listProducts(f());
    expect([first.items.length, first.total, first.pages]).toEqual([CATALOG_PAGE_SIZE, 14, 2]);
    const last = await listProducts(f({ page: "99" }));
    expect([last.page, last.items.length]).toEqual([2, 2]);
    expect(await prisma.product.count()).toBe(14);
  });
});

describe("экранирование поиска в заказах и /admin", () => {
  it("«%» в поиске заказов и товаров админки ищется буквально", async () => {
    const { listAdminProducts } = await import("@/server/admin");
    const { parseAdminProductFilters, parseOrderFilters } = await import("@/lib/filters");
    const { listAdminOrders } = await import("@/server/order-queries");
    const { makeUser, order } = await import("../support/factories");
    const pct = await makeProduct({ name: "Скидка 50%" });
    await makeProduct({ name: "Скидка 500" });
    expect((await listAdminProducts(parseAdminProductFilters({ q: "50%" }))).items.map((p) => p.id)).toEqual([pct.id]);
    const user = await makeUser();
    await order(user.id, [[pct.id, 1]]);
    expect((await listAdminOrders(parseOrderFilters({ q: "_" }))).total).toBe(0);
    expect((await listAdminOrders(parseOrderFilters({ q: "0%" }))).total).toBe(1);
  });
});
