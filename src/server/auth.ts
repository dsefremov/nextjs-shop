/**
 * Better Auth: вход по эл. почте и паролю, сессии в PostgreSQL (адаптер Prisma), роль пользователя —
 * дополнительное поле `role` (customer / manager / admin), которое нельзя передать при регистрации.
 * Секрет — BETTER_AUTH_SECRET(_FILE) или var/secrets/better-auth-secret (docker/secrets.sh).
 */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { readSecret } from "@/lib/config";
import { prisma } from "./db";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://127.0.0.1:8108";

export const auth = betterAuth({
  appName: "Next.js Shop",
  baseURL,
  secret: readSecret("BETTER_AUTH_SECRET", "var/secrets/better-auth-secret"),
  trustedOrigins: [baseURL, baseURL.replace("127.0.0.1", "localhost")],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "customer", input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
  },
  telemetry: { enabled: false },
  // nextCookies — последним: ставит куки сессии из server actions (signIn / signUp / signOut).
  plugins: [nextCookies()],
});

export type Role = "customer" | "manager" | "admin";
