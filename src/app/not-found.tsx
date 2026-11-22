import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center py-20 text-center">
      <p className="text-sm text-neutral-500">Ошибка 404</p>
      <h1 className="mt-2">Страница не найдена</h1>
      <p className="mt-2 text-sm text-neutral-600">Возможно, товар сняли с продажи или адрес набран с ошибкой.</p>
      <Button asChild className="mt-6">
        <Link href="/">В каталог</Link>
      </Button>
    </main>
  );
}
