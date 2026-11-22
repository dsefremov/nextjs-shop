import type { OrderStatus } from "@/generated/prisma/enums";
import { STATUS_LABELS } from "@/lib/order-rules";
import { cn } from "@/lib/utils";

const TONES: Record<OrderStatus, string> = {
  new: "bg-amber-100 text-amber-800",
  paid: "bg-green-100 text-green-800",
  payment_declined: "bg-red-100 text-red-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-neutral-200 text-neutral-700",
  cancelled: "bg-neutral-100 text-neutral-500",
};

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      data-testid="order-status"
      className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONES[status], className)}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
