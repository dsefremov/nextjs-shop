/**
 * Картинки-заглушки для демо-данных (PNG без внешних URL и без нативных зависимостей) — как SeedImage
 * в других магазинах: градиент цвета категории, полупрозрачные круги, тёмная плашка и белая точка.
 */
import { crc32, deflateSync } from "node:zlib";

type RGB = readonly [number, number, number];

/** Детерминированный ГПСЧ (mulberry32): одна и та же картинка для одного slug. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crc]);
}

interface Shape {
  alpha: number;
  color: RGB;
  hit: (x: number, y: number) => boolean;
}

export function makePng(rgb: RGB, seed: number, size = 800): Buffer {
  const rnd = random(seed);
  const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));
  const white: RGB = [255, 255, 255];
  const shapes: Shape[] = [];
  for (let i = 0; i < 5; i++) {
    const r = int(Math.floor(size * 0.15), Math.floor(size * 0.45)) / 2;
    const cx = int(0, size);
    const cy = int(0, size);
    shapes.push({ alpha: 110, color: white, hit: (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r });
  }
  const w = Math.floor(size * (0.35 + int(0, 15) / 100));
  const h = Math.floor(size * (0.3 + int(0, 20) / 100));
  const x0 = (size - w) / 2;
  const y0 = (size - h) / 2;
  const radius = size * 0.05;
  const dark: RGB = [Math.floor(rgb[0] * 0.5), Math.floor(rgb[1] * 0.5), Math.floor(rgb[2] * 0.5)];
  shapes.push({
    alpha: 175,
    color: dark,
    hit: (x, y) => {
      if (x < x0 || x > x0 + w || y < y0 || y > y0 + h) {
        return false;
      }
      const dx = Math.max(x0 + radius - x, 0, x - (x0 + w - radius));
      const dy = Math.max(y0 + radius - y, 0, y - (y0 + h - radius));
      return dx * dx + dy * dy <= radius * radius;
    },
  });
  const c = (size * 0.12) / 2;
  shapes.push({ alpha: 215, color: white, hit: (x, y) => (x - size / 2) ** 2 + (y - size / 2) ** 2 <= c * c });

  // Слой фигур, как в Pillow: верхняя фигура заменяет нижние, затем один раз смешивается с фоном.
  // Сглаживание краёв — 2×2 подвыборки на пиксель.
  const offsets = [0.25, 0.75];
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    const t = (y / size) * 0.75;
    const bg = rgb.map((v) => Math.floor(v + (255 - v) * t)) as unknown as RGB;
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0];
      for (const oy of offsets) {
        for (const ox of offsets) {
          let top: Shape | undefined;
          for (let s = shapes.length - 1; s >= 0; s--) {
            if (shapes[s]!.hit(x + ox, y + oy)) {
              top = shapes[s];
              break;
            }
          }
          for (let k = 0; k < 3; k++) {
            acc[k]! += top ? (top.color[k]! * top.alpha + bg[k]! * (255 - top.alpha)) / 255 : bg[k]!;
          }
        }
      }
      const o = y * stride + 1 + x * 3;
      raw[o] = Math.round(acc[0]! / 4);
      raw[o + 1] = Math.round(acc[1]! / 4);
      raw[o + 2] = Math.round(acc[2]! / 4);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // глубина цвета
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function seedOf(text: string): number {
  return crc32(Buffer.from(text, "utf8")) >>> 0;
}
