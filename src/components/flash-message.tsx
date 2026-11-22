"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface FlashData {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

const STYLES: Record<FlashData["type"], string> = {
  success: "border-green-200 bg-green-50 text-green-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

/**
 * Одноразовое сообщение после действия. Кука сразу удаляется, а при переходе на другую страницу
 * (layout при клиентской навигации не перерисовывается) сообщение скрывается.
 */
export function FlashMessage({ flash }: { flash: FlashData | null }) {
  const pathname = usePathname();
  const [state, setState] = useState({ flash, id: flash?.id, pathname });

  if (flash?.id !== state.id) {
    // Пришло новое сообщение (после server action) — показываем его.
    setState({ flash, id: flash?.id, pathname });
  } else if (pathname !== state.pathname) {
    // Переход на другую страницу без нового сообщения — старое скрываем.
    setState({ flash: null, id: state.id, pathname });
  }

  useEffect(() => {
    if (flash) {
      document.cookie = "flash=; Max-Age=0; path=/; SameSite=Lax";
    }
  }, [flash]);

  const shown = state.flash;
  if (!shown) {
    return null;
  }
  return (
    <div
      role={shown.type === "error" ? "alert" : "status"}
      data-testid={`flash-${shown.type}`}
      className={cn("mb-6 rounded-lg border px-4 py-3 text-sm", STYLES[shown.type])}
    >
      {shown.message}
    </div>
  );
}
