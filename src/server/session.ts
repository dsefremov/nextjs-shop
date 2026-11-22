/**
 * Data Access Layer авторизации: текущий пользователь (один запрос к Better Auth на рендер — React cache)
 * и проверки доступа. Вызываются в каждой странице и каждом server action, а не только в layout.
 */
import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { safeNext } from "@/lib/urls";
import { auth, type Role } from "./auth";

export { safeNext };

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

function toRole(value: unknown): Role {
  return value === "manager" || value === "admin" ? value : "customer";
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }
  const { id, name, email, role } = session.user;
  return { id, name, email, role: toRole(role) };
});

export function isStaff(user: Pick<CurrentUser, "role"> | null): boolean {
  return user?.role === "manager" || user?.role === "admin";
}

export async function requireUser(next = "/"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  }
  return user;
}

/** Менеджер или администратор; покупателю /admin отвечает 404. */
export async function requireStaff(next = "/admin"): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (!isStaff(user)) {
    notFound();
  }
  return user;
}

export async function requireAdmin(next = "/admin"): Promise<CurrentUser> {
  const user = await requireUser(next);
  if (user.role !== "admin") {
    notFound();
  }
  return user;
}
