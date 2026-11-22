/** Ввод цены в рублях («1290», «1 290,50», «1290.5») → копейки; null — если не число или ≤ 0. */
export function parseRubles(input: string): number | null {
  const normalized = input.replace(/[\s\u00a0]/g, "").replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  const [whole, frac = ""] = normalized.split(".");
  const kopecks = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return kopecks > 0 ? kopecks : null;
}

/** Копейки → значение поля ввода («5990» или «1290,50»). */
export function kopecksToInput(kopecks: number): string {
  const whole = Math.floor(kopecks / 100);
  const rest = kopecks % 100;
  return rest ? `${whole},${String(rest).padStart(2, "0")}` : String(whole);
}
