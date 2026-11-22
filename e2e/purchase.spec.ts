import { expect, test } from "@playwright/test";
import { credentials } from "./support/credentials";

/**
 * Сценарий покупки на свежих демо-данных (npm run db:seed) — тот же, что в django-shop и bitrix-shop-classic:
 * гость: каталог → категория → карточка → корзина (2 шт.) → «Оформить заказ» → вход покупателя
 * (пароль из var/demo-users.json) → корзина гостя сохранилась → оформление → «Отказ» →
 * «Оплата отклонена», резерв сохранён → «Оплатить ещё раз» → «Оплачен» в «Моих заказах».
 */
test("гость собирает корзину, входит, оформляет заказ, отказ при оплате и повторная оплата", async ({ page }) => {
  const customer = credentials("customer");

  // 1. Каталог → категория → карточка товара (гость)
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Каталог", level: 1 })).toBeVisible();
  await page.getByRole("navigation", { name: "Категории" }).getByRole("link", { name: /Электроника/ }).click();
  await expect(page.getByRole("heading", { name: "Электроника", level: 1 })).toBeVisible();
  await page.getByRole("link", { name: "Беспроводные наушники Aero" }).first().click();
  await expect(page.getByRole("heading", { name: "Беспроводные наушники Aero", level: 1 })).toBeVisible();
  await expect(page.getByTestId("product-price")).toHaveText("5 990 ₽");
  // 15 по демо-данным, 1 шт. ушла в выполненный демо-заказ.
  await expect(page.getByTestId("product-stock")).toHaveText("В наличии: 14 шт.");

  // 2. В корзину 2 шт. без входа (анонимная корзина по куке)
  await page.getByLabel("Количество").fill("2");
  await page.getByTestId("add-to-cart").click();
  await expect(page.getByTestId("flash-success")).toContainText("добавлен в корзину");
  await expect(page.getByTestId("cart-count")).toHaveText("2");

  await page.getByTestId("cart-link").click();
  await expect(page.getByRole("heading", { name: "Корзина", level: 1 })).toBeVisible();
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await expect(page.getByTestId("cart-qty")).toHaveText("2");
  await expect(page.getByTestId("cart-total")).toHaveText("11 980 ₽");

  // 3. Оформление требует входа; после входа — обратно на оформление, корзина та же
  await page.getByRole("link", { name: "Оформить заказ" }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/login");
  await page.getByLabel("Эл. почта").fill(customer.email);
  await page.getByLabel("Пароль", { exact: true }).fill(customer.password);
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/checkout");
  await expect(page.getByRole("heading", { name: "Оформление заказа", level: 1 })).toBeVisible();
  await expect(page.getByTestId("checkout-total")).toHaveText("11 980 ₽");
  await expect(page.getByLabel("Имя и фамилия")).toHaveValue("Иван Петров");
  await expect(page.getByLabel("Эл. почта")).toHaveValue(customer.email);

  await page.getByLabel("Телефон").fill("+7 900 555-12-34");
  await page.getByLabel("Адрес доставки").fill("г. Москва, ул. Арбат, д. 10, кв. 5");
  await page.getByTestId("place-order").click();

  await expect(page).toHaveURL(/\/orders\/\d+$/);
  await expect(page.getByTestId("flash-success")).toContainText("оформлен");
  await expect(page.getByTestId("order-status")).toHaveText("Новый");
  await expect(page.getByTestId("order-total")).toHaveText("11 980 ₽");
  await expect(page.getByTestId("cart-count")).toHaveCount(0);
  const orderId = new URL(page.url()).pathname.split("/").filter(Boolean).pop();

  // 4. Отказ: заказ не оплачен, статус «Оплата отклонена», можно повторить
  await page.getByTestId("decline-button").click();
  await expect(page.getByTestId("flash-error")).toHaveText("Оплата отклонена. Можно попробовать ещё раз.");
  await expect(page.getByTestId("order-status")).toHaveText("Оплата отклонена");
  await expect(page.getByTestId("payment-declined")).toBeVisible();
  await expect(page.getByTestId("payment-attempt")).toHaveCount(1);

  // Резерв сохранён: на карточке остаток уже уменьшен на 2
  await page.goto("/products/besprovodnye-naushniki-aero");
  await expect(page.getByTestId("product-stock")).toHaveText("В наличии: 12 шт.");
  await page.goto(`/orders/${orderId}`);

  // 5. Повторная оплата
  await expect(page.getByTestId("pay-button")).toHaveText("Оплатить ещё раз");
  await page.getByTestId("pay-button").click();
  await expect(page.getByTestId("flash-success")).toHaveText("Оплата прошла успешно.");
  await expect(page.getByTestId("order-status")).toHaveText("Оплачен");
  await expect(page.getByTestId("payment-declined")).toHaveCount(0);
  await expect(page.getByTestId("pay-button")).toHaveCount(0);
  await expect(page.getByTestId("payment-attempt")).toHaveCount(2);

  // 6. «Мои заказы»: заказ со статусом «Оплачен»; сообщение об оплате при переходе скрылось
  await page.getByRole("navigation", { name: "Основное меню" }).getByRole("link", { name: "Мои заказы" }).click();
  await expect(page.getByRole("heading", { name: "Мои заказы", level: 1 })).toBeVisible();
  await expect(page.getByTestId("flash-success")).toHaveCount(0);
  const row = page.getByTestId("order-row").filter({ hasText: `Заказ №${orderId}` });
  await expect(row).toHaveCount(1);
  await expect(row.getByTestId("order-status")).toHaveText("Оплачен");
});
