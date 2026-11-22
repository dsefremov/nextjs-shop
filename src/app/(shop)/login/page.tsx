import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "@/server/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = safeNext(Array.isArray(next) ? next[0] : next);
  if (await getCurrentUser()) {
    redirect(target);
  }
  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-center">Вход</h1>
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <LoginForm next={target} />
      </div>
    </div>
  );
}
