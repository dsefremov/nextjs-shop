import { describe, expect, it } from "vitest";
import { parseAdminProductFilters } from "@/lib/filters";
import { deleteCategory, deleteProduct, listAdminProducts, saveCategory, saveProduct } from "@/server/admin";
import { prisma } from "@/server/db";
import { makeCategory, makeProduct, makeUser, order } from "../support/factories";

const input = (over: Record<string, unknown> = {}) => ({
  name: "Беспроводные наушники Aero",
  slug: "",
  categoryId: "1",
  description: "",
  price: "5 990",
  stock: "14",
  isActive: true,
  ...over,
});

describe("товары в /admin", () => {
  it("создание: адрес из названия, цена в копейках", async () => {
    await makeCategory();
    const result = await saveProduct(null, input());
    expect(result).toEqual({ ok: true, id: 1 });
    const p = await prisma.product.findUniqueOrThrow({ where: { id: 1 } });
    expect(p).toMatchObject({ slug: "besprovodnye-naushniki-aero", price: 599_000, stock: 14, isActive: true });
  });

  it("ошибки по полям", async () => {
    await makeCategory();
    const r = await saveProduct(null, input({ name: " ", price: "0", stock: "-1", slug: "Плохой адрес" }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.errors).toMatchObject({
      name: "Укажите название.",
      price: "Цена — число больше 0, до двух знаков после запятой.",
      stock: "Остаток не может быть отрицательным.",
      slug: "Только латиница, цифры и дефисы.",
    });
    expect(await saveProduct(null, input({ categoryId: "77" }))).toEqual({ ok: false, errors: { categoryId: "Выберите категорию." } });
    expect(await saveProduct(null, input({ name: "«»" }))).toEqual({ ok: false, errors: { slug: "Укажите адрес латиницей." } });
  });

  it("занятый адрес — ошибка поля, а не 500", async () => {
    await makeCategory();
    await saveProduct(null, input());
    expect(await saveProduct(null, input())).toEqual({ ok: false, errors: { slug: "Такой адрес уже занят." } });
  });

  it("изменение и скрытие", async () => {
    await makeCategory();
    await saveProduct(null, input());
    expect(await saveProduct(1, input({ price: "4990,50", isActive: false, slug: "aero" }))).toEqual({ ok: true, id: 1 });
    expect(await prisma.product.findUniqueOrThrow({ where: { id: 1 } })).toMatchObject({ price: 499_050, isActive: false, slug: "aero" });
  });

  it("удаление товара оставляет снимок в заказах", async () => {
    const user = await makeUser();
    const p = await makeProduct({ name: "Удаляемый", price: 12_300 });
    const o = await order(user.id, [[p.id, 1]]);
    expect(await deleteProduct(p.id)).toEqual({ name: "Удаляемый", image: null });
    expect(await deleteProduct(p.id)).toBeNull();
    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: o.id } });
    expect(item).toMatchObject({ productId: null, productName: "Удаляемый", price: 12_300 });
  });

  it("фильтры списка: поиск по названию и адресу, категория, наличие, видимость, сортировка", async () => {
    const c1 = await makeCategory();
    const c2 = await makeCategory();
    const a = await makeProduct({ name: "Альфа", categoryId: c1.id, stock: 0, price: 300 });
    const b = await makeProduct({ name: "Бета", categoryId: c2.id, stock: 5, isActive: false, price: 100 });
    const c = await makeProduct({ name: "Гамма", categoryId: c2.id, stock: 9, price: 200 });
    const ids = async (params: Record<string, string>) =>
      (await listAdminProducts(parseAdminProductFilters(params))).items.map((p) => p.id);
    expect(await ids({})).toEqual([a.id, b.id, c.id]);
    expect(await ids({ q: b.slug })).toEqual([b.id]);
    expect(await ids({ category: String(c2.id) })).toEqual([b.id, c.id]);
    expect(await ids({ stock: "out" })).toEqual([a.id]);
    expect(await ids({ stock: "in", active: "1" })).toEqual([c.id]);
    expect(await ids({ active: "0" })).toEqual([b.id]);
    expect(await ids({ sort: "-stock" })).toEqual([c.id, b.id, a.id]);
    expect(await ids({ sort: "price" })).toEqual([b.id, c.id, a.id]);
  });
});

describe("категории в /admin", () => {
  it("создание, дубль названия и адреса", async () => {
    expect(await saveCategory(null, { name: "Дом и кухня", slug: "", description: "", position: "10" })).toEqual({ ok: true, id: 1 });
    expect((await prisma.category.findUniqueOrThrow({ where: { id: 1 } })).slug).toBe("dom-i-kukhnya");
    expect(await saveCategory(null, { name: "Дом и кухня", slug: "other", description: "", position: "1" }))
      .toEqual({ ok: false, errors: { name: "Такая категория уже есть." } });
    expect(await saveCategory(null, { name: "Другая", slug: "dom-i-kukhnya", description: "", position: "1" }))
      .toEqual({ ok: false, errors: { slug: "Такой адрес уже занят." } });
    const bad = await saveCategory(null, { name: "", slug: "", description: "", position: "x" });
    expect(!bad.ok && Object.keys(bad.errors).sort()).toEqual(["name", "position"]);
  });

  it("категорию с товарами удалить нельзя, пустую — можно", async () => {
    const full = await makeCategory("С товарами");
    await makeProduct({ categoryId: full.id });
    const empty = await makeCategory("Пустая");
    expect(await deleteCategory(full.id)).toEqual({ ok: false, message: "В категории «С товарами» есть товары (1) — её нельзя удалить." });
    expect(await deleteCategory(empty.id)).toEqual({ ok: true, name: "Пустая" });
    expect(await deleteCategory(empty.id)).toEqual({ ok: false, message: "Категория не найдена." });
    // И на уровне БД — FK RESTRICT.
    await expect(prisma.category.delete({ where: { id: full.id } })).rejects.toThrow();
  });
});
