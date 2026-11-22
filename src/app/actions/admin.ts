"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ADMIN_ACTIONS, STATUS_LABELS } from "@/lib/order-rules";
import { makeSlug } from "@/lib/slug";
import {
  categoryInputFromForm,
  deleteCategory,
  deleteProduct,
  type FieldErrors,
  productInputFromForm,
  saveCategory,
  saveProduct,
} from "@/server/admin";
import { prisma } from "@/server/db";
import { flash } from "@/server/flash";
import { deleteMedia, saveImage, UploadError } from "@/server/media";
import { OrderError, setStatus } from "@/server/orders";
import { requireStaff } from "@/server/session";

export interface AdminFormState {
  errors: FieldErrors;
  values?: Record<string, string | boolean>;
}

async function uploadedImage(
  formData: FormData,
  dir: "products" | "categories",
  name: string,
): Promise<{ path?: string; error?: string }> {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return {};
  }
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    return { path: await saveImage(dir, makeSlug(name).slice(0, 60), bytes) };
  } catch (error) {
    if (error instanceof UploadError) {
      return { error: error.message };
    }
    throw error;
  }
}

function formValues(formData: FormData): Record<string, string | boolean> {
  const values: Record<string, string | boolean> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) {
      values[key] = value;
    }
  }
  values.isActive = formData.get("isActive") === "on";
  return values;
}

export async function saveProductAction(id: number | null, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireStaff(id === null ? "/admin/products/new" : `/admin/products/${id}`);
  const existing = id === null ? null : await prisma.product.findUnique({ where: { id } });
  if (id !== null && !existing) {
    await flash("error", "Товар не найден.");
    redirect("/admin/products");
  }
  const input = productInputFromForm(formData);
  const upload = await uploadedImage(formData, "products", input.name || "product");
  if (upload.error) {
    return { errors: { image: upload.error }, values: formValues(formData) };
  }
  const result = await saveProduct(id, input, upload.path);
  if (!result.ok) {
    await deleteMedia(upload.path);
    return { errors: result.errors, values: formValues(formData) };
  }
  if (upload.path && existing?.image) {
    await deleteMedia(existing.image);
  }
  await flash("success", id === null ? `Товар «${input.name.trim()}» добавлен.` : `Товар «${input.name.trim()}» сохранён.`);
  revalidatePath("/", "layout");
  redirect(formData.get("continue") === "1" ? `/admin/products/${result.id}` : "/admin/products");
}

export async function deleteProductAction(id: number): Promise<void> {
  await requireStaff("/admin/products");
  const deleted = Number.isInteger(id) ? await deleteProduct(id) : null;
  if (deleted) {
    await deleteMedia(deleted.image);
    await flash("success", `Товар «${deleted.name}» удалён.`);
  } else {
    await flash("error", "Товар не найден.");
  }
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function saveCategoryAction(id: number | null, _prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireStaff(id === null ? "/admin/categories/new" : `/admin/categories/${id}`);
  const existing = id === null ? null : await prisma.category.findUnique({ where: { id } });
  if (id !== null && !existing) {
    await flash("error", "Категория не найдена.");
    redirect("/admin/categories");
  }
  const input = categoryInputFromForm(formData);
  const upload = await uploadedImage(formData, "categories", input.name || "category");
  if (upload.error) {
    return { errors: { image: upload.error }, values: formValues(formData) };
  }
  const result = await saveCategory(id, input, upload.path);
  if (!result.ok) {
    await deleteMedia(upload.path);
    return { errors: result.errors, values: formValues(formData) };
  }
  if (upload.path && existing?.image) {
    await deleteMedia(existing.image);
  }
  await flash("success", id === null ? `Категория «${input.name.trim()}» добавлена.` : `Категория «${input.name.trim()}» сохранена.`);
  revalidatePath("/", "layout");
  redirect("/admin/categories");
}

export async function deleteCategoryAction(id: number): Promise<void> {
  await requireStaff("/admin/categories");
  const category = Number.isInteger(id) ? await prisma.category.findUnique({ where: { id } }) : null;
  const result = category ? await deleteCategory(id) : { ok: false as const, message: "Категория не найдена." };
  if (result.ok) {
    await deleteMedia(category?.image);
    await flash("success", `Категория «${result.name}» удалена.`);
    revalidatePath("/", "layout");
    redirect("/admin/categories");
  }
  await flash("error", result.message);
  revalidatePath("/", "layout");
  redirect(category ? `/admin/categories/${id}` : "/admin/categories");
}

/** Статус заказа меняется только действиями (по таблице переходов), отмена возвращает остаток один раз. */
export async function setOrderStatusAction(orderId: number, formData: FormData): Promise<void> {
  await requireStaff(`/admin/orders/${orderId}`);
  const status = String(formData.get("status") ?? "");
  const action = ADMIN_ACTIONS.find((a) => a.status === status);
  if (!action || !Number.isInteger(orderId)) {
    await flash("error", "Неизвестное действие.");
  } else {
    try {
      const order = await setStatus(orderId, action.status);
      await flash(
        "success",
        order.status === "cancelled"
          ? `Заказ №${order.id} отменён, остаток возвращён на склад.`
          : `Заказ №${order.id}: статус «${STATUS_LABELS[order.status]}».`,
      );
    } catch (error) {
      if (!(error instanceof OrderError)) {
        throw error;
      }
      await flash("error", error.message);
    }
  }
  revalidatePath("/admin", "layout");
}
