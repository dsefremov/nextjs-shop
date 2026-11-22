import { describe, expect, it } from "vitest";
import { page, parseAdminProductFilters, parseCatalogFilters, parseOrderFilters, queryString } from "@/lib/filters";

describe("фильтры каталога", () => {
  it("значения по умолчанию", () => {
    expect(parseCatalogFilters({})).toEqual({
      q: undefined, priceMin: undefined, priceMax: undefined, inStock: false, sort: "name", page: 1,
    });
  });

  it("цены в рублях → копейки, флаг наличия, сортировка", () => {
    expect(parseCatalogFilters({ q: "  наушники ", price_min: "590", price_max: "1290,5", in_stock: "1", sort: "-price", page: "3" }))
      .toEqual({ q: "наушники", priceMin: 59_000, priceMax: 129_050, inStock: true, sort: "-price", page: 3 });
  });

  it("неверные значения отбрасываются", () => {
    const f = parseCatalogFilters({ price_min: "abc", price_max: "-1", in_stock: "yes", sort: "drop table", page: "0" });
    expect(f).toMatchObject({ priceMin: undefined, priceMax: undefined, inStock: false, sort: "name", page: 1 });
  });

  it("повторяющийся параметр — берётся первое значение, поиск обрезается до 100 символов", () => {
    expect(parseCatalogFilters({ q: ["a", "b"] }).q).toBe("a");
    expect(parseCatalogFilters({ q: "я".repeat(500) }).q).toHaveLength(100);
  });
});

describe("фильтры заказов", () => {
  it("статус, даты и сортировка", () => {
    expect(parseOrderFilters({ q: "№4", status: "paid", date_from: "2026-11-01", date_to: "2026-11-30", sort: "-total" }))
      .toEqual({ q: "№4", status: "paid", dateFrom: "2026-11-01", dateTo: "2026-11-30", sort: "-total", page: 1 });
  });

  it("несуществующие статус и даты игнорируются", () => {
    expect(parseOrderFilters({ status: "stolen", date_from: "2026-02-30", date_to: "21.11.2026", sort: "x" }))
      .toMatchObject({ status: undefined, dateFrom: undefined, dateTo: undefined, sort: "-created" });
  });
});

describe("фильтры товаров в /admin", () => {
  it("категория, наличие, видимость", () => {
    expect(parseAdminProductFilters({ category: "3", stock: "out", active: "0", sort: "-stock" }))
      .toMatchObject({ categoryId: 3, stock: "out", active: "0", sort: "-stock" });
  });

  it("мусор отбрасывается", () => {
    expect(parseAdminProductFilters({ category: "1;drop", stock: "all", active: "yes" }))
      .toMatchObject({ categoryId: undefined, stock: undefined, active: undefined, sort: "name" });
  });
});

describe("page и queryString", () => {
  it.each([[undefined, 1], ["2", 2], ["abc", 1], ["-1", 1], ["9999999", 1]])("page=%s → %i", (value, n) => {
    expect(page({ page: value })).toBe(n);
  });

  it("queryString пропускает пустые значения", () => {
    expect(queryString({ q: "чай", in_stock: true, sort: "", page: 2, x: undefined, y: null, z: false }))
      .toBe("?q=%D1%87%D0%B0%D0%B9&in_stock=1&page=2");
    expect(queryString({})).toBe("");
  });
});
