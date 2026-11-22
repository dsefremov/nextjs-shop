/**
 * Поддельный контекст запроса для server actions в тестах: куки и заголовки как в Next.js.
 * Сессия — настоящая (вход через Better Auth), подменяется только транспорт next/headers.
 */
import { auth } from "@/server/auth";

export const jar = new Map<string, string>();

export function cookieStore() {
  return {
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    getAll: () => [...jar].map(([name, value]) => ({ name, value })),
    has: (name: string) => jar.has(name),
    set: (name: string | { name: string; value: string }, value?: string) => {
      if (typeof name === "string") {
        jar.set(name, value ?? "");
      } else {
        jar.set(name.name, name.value);
      }
    },
    delete: (name: string) => jar.delete(name),
  };
}

export function requestHeaders(): Headers {
  return new Headers({ cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "), host: "127.0.0.1:8108" });
}

/** Входит пользователем и кладёт куку сессии в jar (как браузер). */
export async function signInAs(email: string, password: string): Promise<void> {
  const response = await auth.api.signInEmail({ body: { email, password }, asResponse: true });
  if (response.status !== 200) {
    throw new Error(`вход не удался: ${response.status}`);
  }
  for (const c of response.headers.getSetCookie()) {
    const [pair] = c.split(";");
    const index = pair!.indexOf("=");
    jar.set(pair!.slice(0, index), pair!.slice(index + 1));
  }
}

/** Что бросил redirect()/notFound() из next/navigation. */
export async function navigation(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (error) {
    const digest = (error as { digest?: unknown }).digest;
    if (typeof digest === "string") {
      if (digest.startsWith("NEXT_REDIRECT")) {
        return `redirect:${digest.split(";")[2]}`;
      }
      if (digest.startsWith("NEXT_HTTP_ERROR_FALLBACK;404")) {
        return "notFound";
      }
    }
    throw error;
  }
  return "none";
}

export function flashMessage(): { type: string; message: string } | null {
  const raw = jar.get("flash");
  return raw ? (JSON.parse(decodeURIComponent(raw)) as { type: string; message: string }) : null;
}
