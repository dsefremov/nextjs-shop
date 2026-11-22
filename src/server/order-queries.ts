/** Запросы заказов: «Мои заказы» покупателя и список заказов в /admin (поиск, статус, даты, сортировка). */
import type { Prisma } from "@/generated/prisma/client";
import type { OrderFilters, OrderSort } from "@/lib/filters";
import { moscowDayStart } from "@/lib/format";
import { likeLiteral } from "@/lib/like";
import { prisma } from "./db";

export const ORDERS_PAGE_SIZE = 10;
export const ADMIN_PAGE_SIZE = 20;

const SORT: Record<OrderSort, Prisma.OrderOrderByWithRelationInput[]> = {
  "-created": [{ createdAt: "desc" }, { id: "desc" }],
  created: [{ createdAt: "asc" }, { id: "desc" }],
  "-total": [{ total: "desc" }, { id: "desc" }],
  total: [{ total: "asc" }, { id: "desc" }],
};

const DAY_MS = 86_400_000;

export function orderWhere(filters: OrderFilters, options: { userId?: string; searchCustomer?: boolean } = {}) {
  const and: Prisma.OrderWhereInput[] = [];
  if (options.userId !== undefined) {
    and.push({ userId: options.userId });
  }
  const q = filters.q?.replace(/^[№#\s]+/, "").trim();
  if (q) {
    const like = likeLiteral(q);
    const or: Prisma.OrderWhereInput[] = [{ items: { some: { productName: { contains: like, mode: "insensitive" } } } }];
    if (/^\d{1,9}$/.test(q)) {
      or.push({ id: Number(q) });
    }
    if (options.searchCustomer) {
      or.push({ customerName: { contains: like, mode: "insensitive" } });
      or.push({ customerEmail: { contains: like, mode: "insensitive" } });
    }
    and.push({ OR: or });
  }
  if (filters.status) {
    and.push({ status: filters.status });
  }
  if (filters.dateFrom) {
    and.push({ createdAt: { gte: moscowDayStart(filters.dateFrom) } });
  }
  if (filters.dateTo) {
    and.push({ createdAt: { lt: new Date(moscowDayStart(filters.dateTo).getTime() + DAY_MS) } });
  }
  return { AND: and } satisfies Prisma.OrderWhereInput;
}

async function paginate(filters: OrderFilters, where: Prisma.OrderWhereInput, size: number) {
  const total = await prisma.order.count({ where });
  const pages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(filters.page, pages);
  const items = await prisma.order.findMany({
    where,
    orderBy: SORT[filters.sort],
    include: { items: { orderBy: { id: "asc" } } },
    skip: (page - 1) * size,
    take: size,
  });
  return { items, total, page, pages };
}

export function listUserOrders(userId: string, filters: OrderFilters) {
  return paginate(filters, orderWhere(filters, { userId }), ORDERS_PAGE_SIZE);
}

export function listAdminOrders(filters: OrderFilters) {
  return paginate(filters, orderWhere(filters, { searchCustomer: true }), ADMIN_PAGE_SIZE);
}

const DETAIL = {
  items: { orderBy: { id: "asc" } },
  paymentAttempts: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
} satisfies Prisma.OrderInclude;

/** Заказ покупателя; чужой — null (страница отдаёт 404). */
export function getUserOrder(userId: string, id: number) {
  return prisma.order.findFirst({ where: { id, userId }, include: DETAIL });
}

export function getOrderForAdmin(id: number) {
  return prisma.order.findUnique({ where: { id }, include: { ...DETAIL, user: true } });
}
