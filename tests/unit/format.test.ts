import { describe, expect, it } from "vitest";
import { formatDateTime, moscowDay, moscowDayStart, NBSP, pluralRu, rub } from "@/lib/format";

describe("rub", () => {
  it.each([
    [599_000, `5${NBSP}990${NBSP}₽`],
    [129_050, `1${NBSP}290,50${NBSP}₽`],
    [69_000, `690${NBSP}₽`],
    [5, `0,05${NBSP}₽`],
    [0, `0${NBSP}₽`],
    [123_456_789_00, `123${NBSP}456${NBSP}789${NBSP}₽`],
    [-1_500, `-15${NBSP}₽`],
  ])("%i коп. → %s", (kopecks, text) => {
    expect(rub(kopecks)).toBe(text);
  });
});

describe("pluralRu", () => {
  const forms = ["товар", "товара", "товаров"] as const;
  it.each([
    [0, "товаров"], [1, "товар"], [2, "товара"], [4, "товара"], [5, "товаров"], [11, "товаров"],
    [12, "товаров"], [14, "товаров"], [21, "товар"], [22, "товара"], [24, "товара"], [101, "товар"], [111, "товаров"],
  ])("%i %s", (n, form) => {
    expect(pluralRu(n, forms)).toBe(form);
  });
});

describe("даты по Москве", () => {
  it("formatDateTime показывает московское время", () => {
    expect(formatDateTime(new Date("2026-11-21T01:41:00Z"))).toBe("21.11.2026 04:41");
  });

  it("moscowDay — календарный день в Москве, а не в UTC", () => {
    expect(moscowDay(new Date("2026-11-21T22:30:00Z"))).toBe("2026-11-22");
    expect(moscowDay(new Date("2026-11-21T20:59:00Z"))).toBe("2026-11-21");
  });

  it("moscowDayStart — полночь по Москве (UTC+3)", () => {
    expect(moscowDayStart("2026-11-22").toISOString()).toBe("2026-11-21T21:00:00.000Z");
  });
});
