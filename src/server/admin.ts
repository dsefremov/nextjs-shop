/**
 * Операции /admin: товары и категории (создание, изменение, удаление с проверками), списки с поиском
 * и фильтрами. Права проверяются в server actions (requireStaff); здесь — валидация и запись.
 */
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import type { AdminProductFilters, AdminProductSort } from "@/lib/filters";
import { parseRubles } from "@/lib/money";
import { likeLiteral } from "@/lib/like";
import { makeSlug } from "@/lib/slug";
import { prisma } from "./db";
import { ADMIN_PAGE_SIZE } from "./order-queries";

export type FieldErrors = Partial<Record<string, string>>;
export type SaveResult = { ok: true; id: number } | { ok: false; errors: FieldErrors };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function firstErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function uniqueTarget(error: Prisma.PrismaClientKnownRequestError): string {
  const meta = JSON.stringify(error.meta ?? {});
  return meta.includes("slug") ? "slug" : "name";
}

// ------------------------------------------------------------------- товары

const productSchema = z.object({
  name: z.string().trim().min(1, "Укажите название.").max(200, "Не длиннее 200 символов."),
  slug: z
    .string()
    .trim()
    .max(220, "Не длиннее 220 символов.")
    .refine((v) => v === "" || SLUG_RE.test(v), "Только латиница, цифры и дефисы."),
  categoryId: z.coerce.number({ message: "Выберите категорию." }).int().positive("Выберите категорию."),
  description: z.string().trim().max(5000, "Не длиннее 5000 символов."),
  price: z
    .string()
    .transform((v, ctx) => {
      const kopecks = parseRubles(v);
      if (kopecks === null) {
        ctx.addIssue({ code: "custom", message: "Цена — число больше 0, до двух знаков после запятой." });
        return z.NEVER;
      }
      return kopecks;
    }),
  stock: z.coerce
    .number({ message: "Остаток — целое число." })
    .int("Остаток — целое число.")
    .min(0, "Остаток не может быть отрицательным.")
    .max(1_000_000, "Слишком большой остаток."),
  isActive: z.boolean(),
});

export type ProductInput = z.input<typeof productSchema>;

export function productInputFromForm(form: FormData): ProductInput {
  return {
    name: String(form.get("name") ?? ""),
    slug: String(form.get("slug") ?? ""),
    categoryId: String(form.get("categoryId") ?? ""),
    description: String(form.get("description") ?? ""),
    price: String(form.get("price") ?? ""),
    stock: String(form.get("stock") ?? "") || "0",
    isActive: form.get("isActive") === "on" || form.get("isActive") === "1",
  };
}

export async function saveProduct(id: number | null, input: ProductInput, image?: string): Promise<SaveResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: firstErrors(parsed.error) };
  }
  const data = parsed.data;
  const slug = data.slug || makeSlug(data.name);
  if (!slug) {
    return { ok: false, errors: { slug: "Укажите адрес латиницей." } };
  }
  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    return { ok: false, errors: { categoryId: "Выберите категорию." } };
  }
  const values = {
    name: data.name,
    slug,
    categoryId: data.categoryId,
    description: data.description,
    price: data.price,
    stock: data.stock,
    isActive: data.isActive,
    ...(image ? { image } : {}),
  };
  try {
    const product = id === null
      ? await prisma.product.create({ data: values })
      : await prisma.product.update({ where: { id }, data: values });
    return { ok: true, id: product.id };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, errors: { slug: "Такой адрес уже занят." } };
    }
    throw error;
  }
}

/** Удаляет товар; в заказах остаётся снимок названия и цены (productId → NULL). */
export async function deleteProduct(id: number): Promise<{ name: string; image: string | null } | null> {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return null;
  }
  await prisma.product.delete({ where: { id } });
  return { name: product.name, image: product.image };
}

const PRODUCT_SORT: Record<AdminProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  name: [{ name: "asc" }, { id: "asc" }],
  "-created": [{ createdAt: "desc" }, { id: "desc" }],
  price: [{ price: "asc" }, { id: "asc" }],
  "-price": [{ price: "desc" }, { id: "asc" }],
  stock: [{ stock: "asc" }, { id: "asc" }],
  "-stock": [{ stock: "desc" }, { id: "asc" }],
};

export function adminProductWhere(filters: AdminProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (filters.q) {
    const q = likeLiteral(filters.q);
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { slug: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filters.categoryId !== undefined) {
    where.categoryId = filters.categoryId;
  }
  if (filters.stock === "in") {
    where.stock = { gt: 0 };
  } else if (filters.stock === "out") {
    where.stock = 0;
  }
  if (filters.active) {
    where.isActive = filters.active === "1";
  }
  return where;
}

export async function listAdminProducts(filters: AdminProductFilters) {
  const where = adminProductWhere(filters);
  const total = await prisma.product.count({ where });
  const pages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const items = await prisma.product.findMany({
    where,
    orderBy: PRODUCT_SORT[filters.sort],
    include: { category: true },
    skip: (page - 1) * ADMIN_PAGE_SIZE,
    take: ADMIN_PAGE_SIZE,
  });
  return { items, total, page, pages };
}

// ------------------------------------------------------------------- категории

const categorySchema = z.object({
  name: z.string().trim().min(1, "Укажите название.").max(120, "Не длиннее 120 символов."),
  slug: z
    .string()
    .trim()
    .max(140, "Не длиннее 140 символов.")
    .refine((v) => v === "" || SLUG_RE.test(v), "Только латиница, цифры и дефисы."),
  description: z.string().trim().max(2000, "Не длиннее 2000 символов."),
  position: z.coerce.number({ message: "Порядок — целое число." }).int("Порядок — целое число.").min(0).max(100_000),
});

export type CategoryInput = z.input<typeof categorySchema>;

export function categoryInputFromForm(form: FormData): CategoryInput {
  return {
    name: String(form.get("name") ?? ""),
    slug: String(form.get("slug") ?? ""),
    description: String(form.get("description") ?? ""),
    position: String(form.get("position") ?? "") || "100",
  };
}

export async function saveCategory(id: number | null, input: CategoryInput, image?: string): Promise<SaveResult> {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: firstErrors(parsed.error) };
  }
  const slug = parsed.data.slug || makeSlug(parsed.data.name);
  if (!slug) {
    return { ok: false, errors: { slug: "Укажите адрес латиницей." } };
  }
  const values = { ...parsed.data, slug, ...(image ? { image } : {}) };
  try {
    const category = id === null
      ? await prisma.category.create({ data: values })
      : await prisma.category.update({ where: { id }, data: values });
    return { ok: true, id: category.id };
  } catch (error) {
    if (isUniqueViolation(error)) {
      const field = uniqueTarget(error);
      return { ok: false, errors: { [field]: field === "slug" ? "Такой адрес уже занят." : "Такая категория уже есть." } };
    }
    throw error;
  }
}

/** Категорию с товарами удалить нельзя (FK RESTRICT) — сначала перенесите или удалите товары. */
export async function deleteCategory(id: number): Promise<{ ok: true; name: string } | { ok: false; message: string }> {
  const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!category) {
    return { ok: false, message: "Категория не найдена." };
  }
  if (category._count.products > 0) {
    return { ok: false, message: `В категории «${category.name}» есть товары (${category._count.products}) — её нельзя удалить.` };
  }
  await prisma.category.delete({ where: { id } });
  return { ok: true, name: category.name };
}

export function listAdminCategories() {
  return prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
}

export function listUsers() {
  return prisma.user.findMany({
    orderBy: [{ createdAt: "asc" }, { email: "asc" }],
    include: { _count: { select: { orders: true } } },
  });
}
