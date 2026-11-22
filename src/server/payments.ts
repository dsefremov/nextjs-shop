/**
 * Платёжный шлюз-заглушка. Деньги не списываются: решение («Оплатить» или «Отказ») передаёт
 * покупатель кнопкой на странице заказа. Интерфейс позволяет подменить шлюз (setPaymentGateway — в тестах).
 */
import { randomBytes } from "node:crypto";

export interface PaymentResult {
  succeeded: boolean;
  reference: string;
  message: string;
}

export interface PaymentGateway {
  charge(orderId: number, amount: number, options: { approve: boolean }): Promise<PaymentResult>;
}

export class FakePaymentGateway implements PaymentGateway {
  async charge(orderId: number, _amount: number, { approve }: { approve: boolean }): Promise<PaymentResult> {
    const reference = `FAKE-${orderId}-${randomBytes(4).toString("hex").toUpperCase()}`;
    return approve
      ? { succeeded: true, reference, message: "Оплата прошла успешно." }
      : { succeeded: false, reference, message: "Платёж отклонён банком (тестовый отказ)." };
  }
}

let gateway: PaymentGateway = new FakePaymentGateway();

export function getPaymentGateway(): PaymentGateway {
  return gateway;
}

export function setPaymentGateway(next: PaymentGateway): void {
  gateway = next;
}
