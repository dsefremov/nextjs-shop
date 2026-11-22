import { describe, expect, it } from "vitest";
import { parseOrderFilters } from "@/lib/filters";
import { prisma } from "@/server/db";
import { getUserOrder, listAdminOrders, listUserOrders } from "@/server/order-queries";
import { pay } from "@/server/orders";
import { makeProduct, makeUser, order } from "../support/factories";

async function setup() {
  const ivan = await makeUser("customer", "Иван Петров");
  const maria = await makeUser("customer", "Мария Соколова");
  const kettle = await makeProduct({ name: "Чайник", price: 100_000 });
  const mug = await makeProduct({ name: "Кружка", price: 20_000 });
  const o1 = await order(ivan.id, [[kettle.id, 1]]); // 1000 ₽
  const o2 = await order(ivan.id, [[mug.id, 1]]); // 200 ₽
  const o3 = await order(maria.id, [[mug.id, 2]], { customerName: "Мария Соколова", customerEmail: "maria@example.test" }); // 400 ₽
  await pay(o2.id, { approve: true });
  await prisma.order.update({ where: { id: o1.id }, data: { createdAt: new Date("2026-11-10T21:30:00Z") } }); // 11.11 по Москве
  await prisma.order.update({ where: { id: o2.id }, data: { createdAt: new Date("2026-11-15T09:00:00Z") } });
  await prisma.order.update({ where: { id: o3.id }, data: { createdAt: new Date("2026-11-20T09:00:00Z") } });
  return { ivan, maria, o1, o2, o3 };
}

const ids = (r: { items: { id: number }[] }) => r.items.map((o) => o.id);

describe("«Мои заказы»", () => {
  it("только свои, сначала новые", async () => {
    const { ivan } = await setup();
    expect(ids(await listUserOrders(ivan.id, parseOrderFilters({})))).toEqual([2, 1]);
  });

  it("поиск по номеру (в т. ч. «№2») и по товару", async () => {
    const { ivan } = await setup();
    expect(ids(await listUserOrders(ivan.id, parseOrderFilters({ q: "№2" })))).toEqual([2]);
    expect(ids(await listUserOrders(ivan.id, parseOrderFilters({ q: "3" })))).toEqual([]);
    expect(ids(await listUserOrders(ivan.id, parseOrderFilters({ q: "чайн" })))).toEqual([1]);
  });

  it("статус, даты по Москве и сортировка по сумме", async () => {
    const { ivan } = await setup();
    expect(ids(await listUserOrders(ivan.id, parseOrderFilters({ status: "paid" })))).toEqual([2]);
    expect(ids(await listUserOrders(ivan.id, parseOrderFilters({ date_from: "2026-11-11", date_to: "2026-11-11" })))).toEqual([1]);
    expect(ids(await listUserOrders(ivan.id, parseOrderFilters({ date_to: "2026-11-10" })))).toEqual([]);
    expect(ids(await listUserOrders(ivan.id, parseOrderFilters({ sort: "total" })))).toEqual([2, 1]);
    expect(ids(await listUserOrders(ivan.id, parseOrderFilters({ sort: "-total" })))).toEqual([1, 2]);
  });

  it("чужой заказ не открывается", async () => {
    const { ivan, maria, o3 } = await setup();
    expect(await getUserOrder(ivan.id, o3.id)).toBeNull();
    const own = await getUserOrder(maria.id, o3.id);
    expect(own?.items).toHaveLength(1);
  });
});

describe("заказы в /admin", () => {
  it("все заказы; поиск по покупателю и почте", async () => {
    const { maria } = await setup();
    expect(ids(await listAdminOrders(parseOrderFilters({})))).toEqual([3, 2, 1]);
    expect(ids(await listAdminOrders(parseOrderFilters({ q: "соколова" })))).toEqual([3]);
    // Поиск по имени покупателя есть только в админке — у покупателя он ищет по товарам.
    expect(ids(await listUserOrders(maria.id, parseOrderFilters({ q: "Иван" })))).toEqual([]);
    expect(ids(await listAdminOrders(parseOrderFilters({ q: "IVAN@example" })))).toEqual([2, 1]);
  });

  it("фильтр по статусу и периоду", async () => {
    await setup();
    expect(ids(await listAdminOrders(parseOrderFilters({ status: "new", date_from: "2026-11-12" })))).toEqual([3]);
  });
});
