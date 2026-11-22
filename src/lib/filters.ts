/**
 * Разбор GET-параметров фильтров (каталог, «Мои заказы», списки /admin). Неизвестные или неверные
 * параметры молча отбрасываются — как в остальных магазинах; страница не падает от «?page=abc».
 */
import type { OrderStatus } from "@/generated/prisma/enums";
import { isOrderStatus } from "./order-rules";

export type SearchParams = Record<string, string | string[] | undefined>;

function one(params: SearchParams, key: string): string | undefined {
  const value = params[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first === undefined ? undefined : first.trim();
}

function text(params: SearchParams, key: string, max = 100): string | undefined {
  const value = one(params, key);
  return value ? value.slice(0, max) : undefined;
}

function rublesToKopecks(params: SearchParams, key: string): number | undefined {
  const value = one(params, key)?.replace(",", ".");
  if (!value || !/^\d{1,9}(\.\d{1,2})?$/.test(value)) {
    return undefined;
  }
  return Math.round(Number(value) * 100);
}

function flag(params: SearchParams, key: string): boolean {
  const value = one(params, key);
  return value === "1" || value === "on" || value === "true";
}

function choice<T extends string>(params: SearchParams, key: string, allowed: readonly T[]): T | undefined {
  const value = one(params, key);
  return allowed.find((item) => item === value);
}

function day(params: SearchParams, key: string): string | undefined {
  const value = one(params, key);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? undefined : value;
}

export function page(params: SearchParams): number {
  const value = one(params, "page");
  const n = value && /^\d{1,6}$/.test(value) ? Number(value) : 1;
  return n >= 1 ? n : 1;
}

// ------------------------------------------------------------------- каталог

export const CATALOG_SORTS = [
  { value: "name", label: "По названию" },
  { value: "price", label: "Сначала дешевле" },
  { value: "-price", label: "Сначала дороже" },
  { value: "-created", label: "Сначала новые" },
] as const;
export type CatalogSort = (typeof CATALOG_SORTS)[number]["value"];

export interface CatalogFilters {
  q?: string;
  priceMin?: number;
  priceMax?: number;
  inStock: boolean;
  sort: CatalogSort;
  page: number;
}

export function parseCatalogFilters(params: SearchParams): CatalogFilters {
  return {
    q: text(params, "q"),
    priceMin: rublesToKopecks(params, "price_min"),
    priceMax: rublesToKopecks(params, "price_max"),
    inStock: flag(params, "in_stock"),
    sort: choice(params, "sort", CATALOG_SORTS.map((s) => s.value)) ?? "name",
    page: page(params),
  };
}

// ------------------------------------------------------------------- заказы

export const ORDER_SORTS = [
  { value: "-created", label: "Сначала новые" },
  { value: "created", label: "Сначала старые" },
  { value: "-total", label: "Сначала дороже" },
  { value: "total", label: "Сначала дешевле" },
] as const;
export type OrderSort = (typeof ORDER_SORTS)[number]["value"];

export interface OrderFilters {
  q?: string;
  status?: OrderStatus;
  dateFrom?: string;
  dateTo?: string;
  sort: OrderSort;
  page: number;
}

export function parseOrderFilters(params: SearchParams): OrderFilters {
  const status = one(params, "status");
  return {
    q: text(params, "q"),
    status: isOrderStatus(status) ? status : undefined,
    dateFrom: day(params, "date_from"),
    dateTo: day(params, "date_to"),
    sort: choice(params, "sort", ORDER_SORTS.map((s) => s.value)) ?? "-created",
    page: page(params),
  };
}

// ------------------------------------------------------------------- /admin/products

export const ADMIN_PRODUCT_SORTS = [
  { value: "name", label: "Название А→Я" },
  { value: "-created", label: "Сначала новые" },
  { value: "price", label: "Сначала дешевле" },
  { value: "-price", label: "Сначала дороже" },
  { value: "stock", label: "Остаток ↑" },
  { value: "-stock", label: "Остаток ↓" },
] as const;
export type AdminProductSort = (typeof ADMIN_PRODUCT_SORTS)[number]["value"];

export interface AdminProductFilters {
  q?: string;
  categoryId?: number;
  stock?: "in" | "out";
  active?: "1" | "0";
  sort: AdminProductSort;
  page: number;
}

export function parseAdminProductFilters(params: SearchParams): AdminProductFilters {
  const category = one(params, "category");
  return {
    q: text(params, "q"),
    categoryId: category && /^\d{1,9}$/.test(category) ? Number(category) : undefined,
    stock: choice(params, "stock", ["in", "out"] as const),
    active: choice(params, "active", ["1", "0"] as const),
    sort: choice(params, "sort", ADMIN_PRODUCT_SORTS.map((s) => s.value)) ?? "name",
    page: page(params),
  };
}

// ------------------------------------------------------------------- строка запроса

/** Собирает строку запроса без пустых значений: для ссылок пагинации и сброса фильтров. */
export function queryString(values: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === null || value === "" || value === false) {
      continue;
    }
    sp.set(key, value === true ? "1" : String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
