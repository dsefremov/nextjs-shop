import Image from "next/image";
import { cn } from "@/lib/utils";

/** Фото из MEDIA_ROOT (маршрут /media/…). Файлы уже нужного размера — без оптимизатора next/image. */
export function MediaImage({
  path,
  alt,
  size,
  className,
  priority,
}: {
  path: string | null;
  alt: string;
  size: number;
  className?: string;
  priority?: boolean;
}) {
  if (!path) {
    return <div className={cn("bg-neutral-100", className)} aria-hidden />;
  }
  return (
    <Image
      src={`/media/${path}`}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}
