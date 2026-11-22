/** Статусы заказа и таблица переходов (оплата и отказ — только через сервис оплаты). */
import type { OrderStatus } from "@/generated/prisma/enums";

export const ORDER_STATUSES = [
  "new",
  "paid",
  "payment_declined",
  "processing",
  "completed",
  "cancelled",
] as const satisfies readonly OrderStatus[];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новый",
  paid: "Оплачен",
  payment_declined: "Оплата отклонена",
  processing: "В работе",
  completed: "Выполнен",
  cancelled: "Отменён",
};

export const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ["cancelled"],
  payment_declined: ["cancelled"],
  paid: ["processing", "completed", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const PAYABLE: readonly OrderStatus[] = ["new", "payment_declined"];

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function isPayable(status: OrderStatus): boolean {
  return PAYABLE.includes(status);
}

/** Покупатель может отменить только неоплаченный заказ. */
export function canCustomerCancel(status: OrderStatus): boolean {
  return PAYABLE.includes(status);
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Действия менеджера в /admin (подписи кнопок). Оплата из админки не ставится. */
export const ADMIN_ACTIONS: { status: OrderStatus; label: string }[] = [
  { status: "processing", label: "В работе" },
  { status: "completed", label: "Выполнен" },
  { status: "cancelled", label: "Отменить (вернуть остаток)" },
];
