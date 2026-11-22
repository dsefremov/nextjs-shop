/** Форматирование для интерфейса: рубли, русские множественные формы, даты по Москве. */

export const NBSP = "\u00a0";
export const TIME_ZONE = "Europe/Moscow";

/** 599000 коп. → «5 990 ₽», 129050 → «1 290,50 ₽» (неразрывные пробелы). */
export function rub(kopecks: number): string {
  const sign = kopecks < 0 ? "-" : "";
  const abs = Math.abs(Math.round(kopecks));
  const whole = Math.floor(abs / 100);
  const rest = abs % 100;
  const text = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${sign}${text}${rest ? `,${String(rest).padStart(2, "0")}` : ""}${NBSP}₽`;
}

/** pluralRu(24, ["товар", "товара", "товаров"]) → «товара». */
export function pluralRu(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(Math.trunc(n));
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return forms[0];
  }
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) {
    return forms[1];
  }
  return forms[2];
}

const dateTime = new Intl.DateTimeFormat("ru-RU", {
  timeZone: TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** «21.11.2026 04:41» по Москве. */
export function formatDateTime(date: Date): string {
  return dateTime.format(date).replace(",", "");
}

/** Дата YYYY-MM-DD по Москве (значения полей type=date). */
export function moscowDay(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: TIME_ZONE });
}

/** Начало суток YYYY-MM-DD по Москве (UTC+3, без перехода на летнее время) как момент времени. */
export function moscowDayStart(day: string): Date {
  return new Date(`${day}T00:00:00+03:00`);
}
