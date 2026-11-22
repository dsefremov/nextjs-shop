"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center py-20 text-center">
      <h1>Что-то пошло не так</h1>
      <p className="mt-2 text-sm text-neutral-600">Попробуйте обновить страницу.</p>
      <Button className="mt-6" onClick={reset}>
        Повторить
      </Button>
    </main>
  );
}
