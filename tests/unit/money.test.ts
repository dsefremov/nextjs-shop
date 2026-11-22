import { describe, expect, it } from "vitest";
import { kopecksToInput, parseRubles } from "@/lib/money";

describe("parseRubles", () => {
  it.each([
    ["1290", 129_000],
    ["1 290,50", 129_050],
    ["1\u00a0290", 129_000],
    ["1290.5", 129_050],
    ["0,01", 1],
    ["999999999", 99_999_999_900],
  ])("«%s» → %i коп.", (input, kopecks) => {
    expect(parseRubles(input)).toBe(kopecks);
  });

  it.each(["", "0", "0,00", "-5", "abc", "1,234", "12e3", "1 290,5,0", "1000000000"])("«%s» — не цена", (input) => {
    expect(parseRubles(input)).toBeNull();
  });
});

describe("kopecksToInput", () => {
  it("целые рубли без копеек, иначе с запятой", () => {
    expect(kopecksToInput(599_000)).toBe("5990");
    expect(kopecksToInput(129_050)).toBe("1290,50");
    expect(kopecksToInput(105)).toBe("1,05");
  });

  it("обратимо с parseRubles", () => {
    for (const k of [1, 99, 100, 129_050, 599_000]) {
      expect(parseRubles(kopecksToInput(k))).toBe(k);
    }
  });
});
