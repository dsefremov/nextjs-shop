import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/server/session";
import { PasswordForm, ProfileForm } from "./account-forms";

export const metadata: Metadata = { title: "Профиль" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <h1>Профиль</h1>
        <Link href="/orders" className="text-sm text-neutral-600 hover:underline">
          Мои заказы
        </Link>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
          <h2 className="mb-4 font-semibold">Личные данные</h2>
          <ProfileForm name={user.name} email={user.email} />
        </section>
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
          <h2 className="mb-4 font-semibold">Смена пароля</h2>
          <PasswordForm />
        </section>
      </div>
    </div>
  );
}
