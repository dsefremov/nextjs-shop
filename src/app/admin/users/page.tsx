import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { listUsers } from "@/server/admin";
import { requireAdmin } from "@/server/session";

export const metadata: Metadata = { title: "Пользователи" };

const ROLE_LABELS: Record<string, string> = { admin: "Администратор", manager: "Менеджер", customer: "Покупатель" };

/** Только для администратора: менеджеру раздел недоступен (404). */
export default async function AdminUsersPage() {
  await requireAdmin("/admin/users");
  const users = await listUsers();
  return (
    <div>
      <AdminPageHeader title="Пользователи" />
      <div className="rounded-xl border border-neutral-200 bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Имя</TableHead>
              <TableHead>Эл. почта</TableHead>
              <TableHead>Роль</TableHead>
              <TableHead className="text-right">Заказов</TableHead>
              <TableHead>Зарегистрирован</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} data-testid="admin-row">
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{ROLE_LABELS[u.role] ?? u.role}</TableCell>
                <TableCell className="text-right">{u._count.orders}</TableCell>
                <TableCell className="text-neutral-500">{formatDateTime(u.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
