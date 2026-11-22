import { describe, expect, it } from "vitest";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth";
import { makeUser, randomPassword } from "../support/factories";

describe("Better Auth", () => {
  it("регистрация создаёт покупателя; роль из запроса игнорируется", async () => {
    const password = randomPassword();
    const body = { email: "new@example.test", password, name: "Новый Покупатель", role: "admin" };
    await auth.api.signUpEmail({ body: body as { email: string; password: string; name: string } });
    const user = await prisma.user.findUniqueOrThrow({ where: { email: "new@example.test" } });
    expect(user.role).toBe("customer");
    const account = await prisma.account.findFirstOrThrow({ where: { userId: user.id } });
    expect(account.providerId).toBe("credential");
    expect(account.password).not.toContain(password);
  });

  it("вход пользователем из сида (hashPassword) и сессия по куке", async () => {
    const user = await makeUser("manager", "Менеджер");
    const response = await auth.api.signInEmail({ body: { email: user.email, password: user.password }, asResponse: true });
    expect(response.status).toBe(200);
    const cookie = response.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
    const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(session?.user).toMatchObject({ email: user.email, role: "manager" });
  });

  it("неверный пароль и короткий пароль отклоняются", async () => {
    const user = await makeUser();
    await expect(auth.api.signInEmail({ body: { email: user.email, password: `${user.password}x` } })).rejects.toThrow();
    await expect(auth.api.signUpEmail({ body: { email: "short@example.test", password: "x".repeat(7), name: "Коротко" } })).rejects.toThrow();
    expect(await prisma.user.count({ where: { email: "short@example.test" } })).toBe(0);
  });
});
