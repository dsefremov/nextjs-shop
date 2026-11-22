/**
 * Фото товаров и категорий: файлы в MEDIA_ROOT (по умолчанию var/media, вне git), в БД — путь
 * вида products/<slug>-<hex>.png. Раздаются маршрутом /media/[...path]. Загружать можно только
 * PNG, JPEG и WebP до 5 МБ — тип проверяется по сигнатуре файла, а не по имени.
 */
import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join, normalize, resolve, sep } from "node:path";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function mediaRoot(): string {
  // turbopackIgnore: каталог задаётся окружением во время работы, трассировать проект не нужно.
  return resolve(/*turbopackIgnore: true*/ process.env.MEDIA_ROOT ?? "var/media");
}

const SIGNATURES: { ext: string; type: string; test: (b: Buffer) => boolean }[] = [
  { ext: "png", type: "image/png", test: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  { ext: "jpg", type: "image/jpeg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: "webp",
    type: "image/webp",
    test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

export const CONTENT_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

export function detectImage(bytes: Buffer): { ext: string; type: string } | null {
  return SIGNATURES.find((s) => s.test(bytes)) ?? null;
}

export class UploadError extends Error {
  override name = "UploadError";
}

/** Сохраняет байты картинки и возвращает относительный путь (products/…). */
export async function saveImage(dir: "products" | "categories", baseName: string, bytes: Buffer): Promise<string> {
  if (bytes.length === 0) {
    throw new UploadError("Файл пустой.");
  }
  if (bytes.length > MAX_UPLOAD_BYTES) {
    throw new UploadError("Файл больше 5 МБ.");
  }
  const kind = detectImage(bytes);
  if (!kind) {
    throw new UploadError("Нужна картинка PNG, JPEG или WebP.");
  }
  const name = `${baseName || "image"}-${randomBytes(4).toString("hex")}.${kind.ext}`;
  await mkdir(join(/*turbopackIgnore: true*/ mediaRoot(), dir), { recursive: true });
  await writeFile(join(/*turbopackIgnore: true*/ mediaRoot(), dir, name), bytes);
  return `${dir}/${name}`;
}

/** Абсолютный путь файла внутри MEDIA_ROOT или null (выход за каталог, неизвестное расширение). */
export function resolveMediaPath(relative: string): string | null {
  const root = mediaRoot();
  const full = resolve(root, normalize(relative));
  if (!full.startsWith(root + sep)) {
    return null;
  }
  const ext = full.split(".").pop() ?? "";
  return CONTENT_TYPES[ext] ? full : null;
}

export async function readMedia(relative: string): Promise<{ bytes: Buffer; type: string } | null> {
  const full = resolveMediaPath(relative);
  if (!full) {
    return null;
  }
  try {
    const bytes = await readFile(/*turbopackIgnore: true*/ full);
    return { bytes, type: CONTENT_TYPES[full.split(".").pop()!]! };
  } catch {
    return null;
  }
}

export async function deleteMedia(relative: string | null | undefined): Promise<void> {
  const full = relative ? resolveMediaPath(relative) : null;
  if (full) {
    await unlink(full).catch(() => undefined);
  }
}
