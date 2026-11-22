/**
 * Server actions целиком: права доступа (DAL), куки корзины и сессии, сообщения и переадресации.
 * Подменён только транспорт next/headers и revalidatePath; сессии — настоящие (Better Auth).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cookieStore, flashMessage, jar, navigation, requestHeaders, signInAs } from "../support/request";

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore(),
  headers: async () => requestHeaders(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));

const { addToCartAction, updateCartAction } = await import("@/app/actions/cart");
const { cancelOrderAction, checkoutAction, payOrderAction } = await import("@/app/actions/orders");
const { deleteCategoryAction, saveProductAction, setOrderStatusAction } = await import("@/app/actions/admin");
const { loginAction } = await import("@/app/actions/auth");
const { prisma } = await import("@/server/db");
const { CART_COOKIE } = await import("@/server/cart-session");
const { makeCategory, makeProduct, makeUser, order, stockOf } = await import("../support/factories");

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) {
    fd.set(k, v);
  }
  return fd;
}

const checkoutForm = form({
  customerName: "Иван Петров",
  customerEmail: "ivan@example.test",
  customerPhone: "+7 900 000-00-00",
  address: "г. Москва, ул. Тестовая, д. 1",
  comment: "",
});
const emptyCheckout = { values: { customerName: "", customerEmail: "", customerPhone: "", address: "", comment: "" }, errors: {} };

beforeEach(() => {
  jar.clear();
});

describe("корзина гостя и вход", () => {
  it("гость получает httpOnly-корзину по куке; при входе она сливается с корзиной покупателя", async () => {
    const p = await makeProduct({ name: "Чайник", stock: 5 });
    await addToCartAction(p.id, form({ quantity: "2" }));
    expect(flashMessage()).toMatchObject({ type: "success", message: "«Чайник» добавлен в корзину." });
    const guestCart = jar.get(CART_COOKIE)!;
    expect(await prisma.cartItem.findMany({ where: { cartId: guestCart } })).toHaveLength(1);

    const user = await makeUser();
    const result = await navigation(() =>
      loginAction({ email: "", errors: {} }, form({ email: user.email, password: user.password, next: "/checkout" })),
    );
    expect(result).toBe("redirect:/checkout");
    const cart = await prisma.cart.findUniqueOrThrow({ where: { userId: user.id }, include: { items: true } });
    expect(cart.items.map((i) => [i.productId, i.quantity])).toEqual([[p.id, 2]]);
    expect(await prisma.cart.findUnique({ where: { id: guestCart } })).toBeNull();
  });

  it("неверный пароль — ошибка формы, без переадресации и без сессии", async () => {
    const user = await makeUser();
    const state = await loginAction({ email: "", errors: {} }, form({ email: user.email, password: `${user.password}-wrong` }));
    expect(state.errors.form).toBe("Неверная эл. почта или пароль.");
    expect([...jar.keys()].some((k) => k.includes("session"))).toBe(false);
  });

  it("неверное количество и чужая кука корзины", async () => {
    const p = await makeProduct({ stock: 2 });
    await updateCartAction(p.id, form({ quantity: "abc" }));
    expect(flashMessage()?.message).toBe("Неверное количество.");
    jar.set(CART_COOKIE, "00000000-0000-0000-0000-000000000000");
    await addToCartAction(p.id, form({ quantity: "1" }));
    expect(jar.get(CART_COOKIE)).not.toBe("00000000-0000-0000-0000-000000000000");
    await addToCartAction(999, form({}));
    expect(flashMessage()?.message).toBe("Товар не найден.");
  });
});

describe("оформление и оплата", () => {
  it("без входа оформление ведёт на /login?next=/checkout", async () => {
    expect(await navigation(() => checkoutAction(emptyCheckout, checkoutForm))).toBe("redirect:/login?next=%2Fcheckout");
  });

  it("покупка с отказом и повторной оплатой через actions", async () => {
    const user = await makeUser();
    const p = await makeProduct({ stock: 3, price: 10_000 });
    await signInAs(user.email, user.password);
    await addToCartAction(p.id, form({ quantity: "2" }));
    expect(await navigation(() => checkoutAction(emptyCheckout, checkoutForm))).toBe("redirect:/orders/1");
    expect(await stockOf(p.id)).toBe(1);
    expect(await prisma.cartItem.count()).toBe(0);

    await payOrderAction(1, form({ decision: "decline" }));
    expect(flashMessage()?.message).toBe("Оплата отклонена. Можно попробовать ещё раз.");
    await payOrderAction(1, form({ decision: "pay" }));
    expect(flashMessage()?.message).toBe("Оплата прошла успешно.");
    await payOrderAction(1, form({ decision: "pay" }));
    expect(flashMessage()).toMatchObject({ type: "error" });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: 1 } })).status).toBe("paid");
    await cancelOrderAction(1);
    expect(flashMessage()?.message).toBe("Этот заказ уже нельзя отменить.");
  });

  it("ошибки формы оформления возвращаются по полям, заказ не создаётся", async () => {
    const user = await makeUser();
    await signInAs(user.email, user.password);
    const state = await checkoutAction(emptyCheckout, form({ customerName: "И", customerEmail: "x", customerPhone: "abc", address: "", comment: "" }));
    expect(Object.keys(state.errors).sort()).toEqual(["address", "customerEmail", "customerName", "customerPhone"]);
    expect(await prisma.order.count()).toBe(0);
  });

  it("товар закончился, пока лежал в корзине, — сообщение в форме", async () => {
    const user = await makeUser();
    const p = await makeProduct({ name: "Последний", stock: 1 });
    await signInAs(user.email, user.password);
    await addToCartAction(p.id, form({}));
    await prisma.product.update({ where: { id: p.id }, data: { stock: 0 } });
    const state = await checkoutAction(emptyCheckout, checkoutForm);
    expect(state.errors.form).toBe("Недостаточно на складе: Последний.");
  });

  it("чужой заказ нельзя оплатить или отменить", async () => {
    const owner = await makeUser();
    const other = await makeUser();
    const p = await makeProduct({ stock: 3 });
    await order(owner.id, [[p.id, 1]]);
    await signInAs(other.email, other.password);
    expect(await navigation(() => payOrderAction(1, form({ decision: "pay" })))).toBe("redirect:/orders");
    expect(await navigation(() => cancelOrderAction(1))).toBe("redirect:/orders");
    expect(flashMessage()?.message).toBe("Заказ не найден.");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: 1 } })).status).toBe("new");
    expect(await prisma.paymentAttempt.count()).toBe(0);
  });

  it("покупатель отменяет неоплаченный заказ — остаток возвращается", async () => {
    const user = await makeUser();
    const p = await makeProduct({ stock: 3 });
    await order(user.id, [[p.id, 2]]);
    await signInAs(user.email, user.password);
    await cancelOrderAction(1);
    expect(await stockOf(p.id)).toBe(3);
  });
});

describe("доступ к /admin", () => {
  it("гостя отправляет на вход, покупателю — 404, ничего не меняется", async () => {
    const category = await makeCategory();
    const productForm = form({ name: "Взлом", categoryId: String(category.id), price: "1", stock: "1", isActive: "on" });
    expect(await navigation(() => saveProductAction(null, { errors: {} }, productForm))).toBe(
      "redirect:/login?next=%2Fadmin%2Fproducts%2Fnew",
    );
    const customer = await makeUser("customer");
    await signInAs(customer.email, customer.password);
    expect(await navigation(() => saveProductAction(null, { errors: {} }, productForm))).toBe("notFound");
    expect(await navigation(() => deleteCategoryAction(category.id))).toBe("notFound");
    expect(await navigation(() => setOrderStatusAction(1, form({ status: "cancelled" })))).toBe("notFound");
    expect(await prisma.product.count()).toBe(0);
    expect(await prisma.category.count()).toBe(1);
  });

  it("менеджер создаёт товар и ведёт заказ по статусам; «Оплачен» вручную не ставится", async () => {
    const category = await makeCategory();
    const manager = await makeUser("manager");
    const customer = await makeUser();
    await signInAs(manager.email, manager.password);
    const created = await navigation(() =>
      saveProductAction(null, { errors: {} }, form({ name: "Новинка", categoryId: String(category.id), price: "1 290,50", stock: "3", isActive: "on" })),
    );
    expect(created).toBe("redirect:/admin/products");
    const p = await prisma.product.findFirstOrThrow({ where: { name: "Новинка" } });
    expect([p.price, p.slug]).toEqual([129_050, "novinka"]);

    await order(customer.id, [[p.id, 2]]);
    await setOrderStatusAction(1, form({ status: "paid" }));
    expect(flashMessage()?.message).toBe("Неизвестное действие.");
    await setOrderStatusAction(1, form({ status: "processing" }));
    expect(flashMessage()).toMatchObject({ type: "error" });
    await setOrderStatusAction(1, form({ status: "cancelled" }));
    expect(flashMessage()?.message).toBe("Заказ №1 отменён, остаток возвращён на склад.");
    expect(await stockOf(p.id)).toBe(3);
  });

  it("неверная картинка — ошибка поля, товар не создаётся", async () => {
    const category = await makeCategory();
    const manager = await makeUser("manager");
    await signInAs(manager.email, manager.password);
    const fd = form({ name: "С картинкой", categoryId: String(category.id), price: "10", stock: "1" });
    fd.set("image", new File(["<svg/>"], "x.png", { type: "image/png" }));
    const state = await saveProductAction(null, { errors: {} }, fd);
    expect(state.errors.image).toBe("Нужна картинка PNG, JPEG или WebP.");
    expect(await prisma.product.count()).toBe(0);
  });
});
