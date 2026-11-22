/**
 * Единственный экземпляр Prisma Client на процесс (Prisma 7: драйвер-адаптер @prisma/adapter-pg).
 * В dev-режиме переживает горячую перезагрузку модулей через globalThis.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseUrl } from "@/lib/config";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: databaseUrl("app") });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/** Клиент внутри интерактивной транзакции. */
export type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
