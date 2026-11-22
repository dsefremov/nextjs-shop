/**
 * Одноразовые сообщения после действий (аналог django.contrib.messages): server action кладёт
 * сообщение в короткоживущую куку, layout показывает его, клиентский компонент сразу удаляет куку.
 */
import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export type FlashType = "success" | "error" | "info" | "warning";
export interface Flash {
  id: string;
  type: FlashType;
  message: string;
}

export const FLASH_COOKIE = "flash";

export async function flash(type: FlashType, message: string): Promise<void> {
  const value: Flash = { id: randomBytes(4).toString("hex"), type, message };
  (await cookies()).set(FLASH_COOKIE, encodeURIComponent(JSON.stringify(value)), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    httpOnly: false,
  });
}

export async function readFlash(): Promise<Flash | null> {
  const raw = (await cookies()).get(FLASH_COOKIE)?.value;
  if (!raw) {
    return null;
  }
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<Flash>;
    const types: FlashType[] = ["success", "error", "info", "warning"];
    if (typeof value.message === "string" && typeof value.id === "string" && types.includes(value.type as FlashType)) {
      return { id: value.id, type: value.type as FlashType, message: value.message.slice(0, 300) };
    }
  } catch {
    // повреждённая кука — просто не показываем
  }
  return null;
}
