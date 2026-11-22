/** Безопасный адрес возврата после входа: только относительный путь этого сайта (без //host и \\host). */
export function safeNext(next: unknown, fallback = "/"): string {
  return typeof next === "string" && /^\/(?![/\\])/.test(next) && !/[\r\n]/.test(next) ? next : fallback;
}
