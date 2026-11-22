import { redirect } from "next/navigation";
import { requireStaff } from "@/server/session";

export default async function AdminIndex() {
  await requireStaff("/admin");
  redirect("/admin/orders");
}
