import { prisma } from "@/server/db";

/** Проверка живости для healthcheck контейнера: приложение отвечает и база доступна. */
export async function GET(): Promise<Response> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "db-unavailable" }, { status: 503 });
  }
}
