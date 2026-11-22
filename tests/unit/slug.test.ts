import { describe, expect, it } from "vitest";
import { makeSlug } from "@/lib/slug";
import { CATALOG } from "@/server/demo/demo";

describe("makeSlug", () => {
  it.each([
    ["Беспроводные наушники Aero", "besprovodnye-naushniki-aero"],
    ["Электроника", "elektronika"],
    ["Дом и кухня", "dom-i-kukhnya"],
    ["Щётка, ёлка и «Чай»!", "shchetka-elka-i-chay"],
    ["Гантели 2 × 5 кг", "ganteli-2-5-kg"],
    ["  --Café  Crème--  ", "cafe-creme"],
    ["«»—", ""],
  ])("«%s» → %s", (text, slug) => {
    expect(makeSlug(text)).toBe(slug);
  });

  it("slug всех демо-товаров уникальны и непусты", () => {
    const slugs = CATALOG.flatMap((c) => [makeSlug(c.name), ...c.products.map(([name]) => makeSlug(name))]);
    expect(slugs.every((s) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s))).toBe(true);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
