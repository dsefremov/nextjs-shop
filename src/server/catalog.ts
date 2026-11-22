/** Запросы каталога: категории, список товаров с поиском, фильтрами, сортировкой и пагинацией. */
import type { Prisma } from "@/generated/prisma/client";
import type { CatalogFilters, CatalogSort } from "@/lib/filters";
import { likeLiteral } from "@/lib/like";
import { prisma } from "./db";

export const CATALOG_PAGE_SIZE = 12;

export async function categoriesWithCounts() {
  const categories = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { isActive: true } } } } },
  });
  return categories.map((c) => ({ ...c, productCount: c._count.products }));
}

export function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}

const SORT: Record<CatalogSort, Prisma.ProductOrderByWithRelationInput[]> = {
  name: [{ name: "asc" }, { id: "asc" }],
  price: [{ price: "asc" }, { id: "asc" }],
  "-price": [{ price: "desc" }, { id: "asc" }],
  "-created": [{ createdAt: "desc" }, { id: "asc" }],
};

export function catalogWhere(filters: CatalogFilters, categoryId?: number): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { isActive: true };
  if (categoryId !== undefined) {
    where.categoryId = categoryId;
  }
  if (filters.q) {
    const q = likeLiteral(filters.q);
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    where.price = { gte: filters.priceMin, lte: filters.priceMax };
  }
  if (filters.inStock) {
    where.stock = { gt: 0 };
  }
  return where;
}

export async function listProducts(filters: CatalogFilters, categoryId?: number) {
  const where = catalogWhere(filters, categoryId);
  const total = await prisma.product.count({ where });
  const pages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const items = await prisma.product.findMany({
    where,
    orderBy: SORT[filters.sort],
    include: { category: true },
    skip: (page - 1) * CATALOG_PAGE_SIZE,
    take: CATALOG_PAGE_SIZE,
  });
  return { items, total, page, pages };
}

/** Диапазон цен видимых товаров — подсказки в полях фильтра. */
export async function priceRange(): Promise<{ min: number; max: number } | null> {
  const r = await prisma.product.aggregate({ where: { isActive: true }, _min: { price: true }, _max: { price: true } });
  return r._min.price === null || r._max.price === null ? null : { min: r._min.price, max: r._max.price };
}

export function getActiveProductBySlug(slug: string) {
  return prisma.product.findFirst({ where: { slug, isActive: true }, include: { category: true } });
}

export function getActiveProduct(id: number) {
  return prisma.product.findFirst({ where: { id, isActive: true } });
}
