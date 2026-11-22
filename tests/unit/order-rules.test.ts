import { describe, expect, it } from "vitest";
import {
  ADMIN_ACTIONS,
  canCustomerCancel,
  canTransition,
  isOrderStatus,
  isPayable,
  ORDER_STATUSES,
  STATUS_LABELS,
  TRANSITIONS,
} from "@/lib/order-rules";

describe("правила статусов заказа", () => {
  it("у каждого статуса есть подпись и строка в таблице переходов", () => {
    for (const status of ORDER_STATUSES) {
      expect(STATUS_LABELS[status]).toBeTruthy();
      expect(TRANSITIONS[status]).toBeDefined();
    }
  });

  it("оплатить и отменить покупателем можно только новый или отклонённый заказ", () => {
    expect(ORDER_STATUSES.filter(isPayable)).toEqual(["new", "payment_declined"]);
    expect(ORDER_STATUSES.filter(canCustomerCancel)).toEqual(["new", "payment_declined"]);
  });

  it.each([
    ["new", "cancelled", true],
    ["new", "paid", false],
    ["new", "completed", false],
    ["payment_declined", "cancelled", true],
    ["paid", "processing", true],
    ["paid", "completed", true],
    ["paid", "cancelled", true],
    ["processing", "completed", true],
    ["processing", "paid", false],
    ["completed", "cancelled", false],
    ["cancelled", "new", false],
  ] as const)("%s → %s: %s", (from, to, allowed) => {
    expect(canTransition(from, to)).toBe(allowed);
  });

  it("из конечных статусов переходов нет", () => {
    expect(TRANSITIONS.completed).toEqual([]);
    expect(TRANSITIONS.cancelled).toEqual([]);
  });

  it("админка не ставит «Оплачен» вручную", () => {
    expect(ADMIN_ACTIONS.map((a) => a.status)).toEqual(["processing", "completed", "cancelled"]);
  });

  it("isOrderStatus отсекает чужие значения", () => {
    expect(isOrderStatus("paid")).toBe(true);
    expect(isOrderStatus("PAID")).toBe(false);
    expect(isOrderStatus(undefined)).toBe(false);
  });
});
