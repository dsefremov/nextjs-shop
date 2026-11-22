/**
 * Prisma `contains` превращается в ILIKE '%…%' и не экранирует шаблонные символы: без этого запрос
 * «50%» нашёл бы и «500 рублей», а «_» — любой символ. Экранируем \, % и _ (в PostgreSQL escape — «\»).
 */
export function likeLiteral(text: string): string {
  return text.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
