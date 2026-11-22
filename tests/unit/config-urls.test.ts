import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { databaseUrl, readSecret } from "@/lib/config";
import { safeNext } from "@/lib/urls";

describe("настройки", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("секрет: переменная, затем файл NAME_FILE", () => {
    const dir = mkdtempSync(join(tmpdir(), "cfg-"));
    const file = join(dir, "s");
    writeFileSync(file, "from-file\n");
    vi.stubEnv("X_SECRET", "");
    vi.stubEnv("X_SECRET_FILE", file);
    expect(readSecret("X_SECRET")).toBe("from-file");
    vi.stubEnv("X_SECRET", "direct");
    expect(readSecret("X_SECRET")).toBe("direct");
    vi.stubEnv("X_SECRET", "");
    vi.stubEnv("X_SECRET_FILE", join(dir, "missing"));
    expect(readSecret("X_SECRET")).toBeUndefined();
  });

  it("строка подключения собирается из DB_* и экранирует пароль", () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("DB_HOST", "db.local");
    vi.stubEnv("DB_PORT", "5432");
    vi.stubEnv("DB_NAME", "shop");
    vi.stubEnv("DB_USER", "u");
    vi.stubEnv("DB_PASSWORD", "p@ss/w:rd");
    expect(databaseUrl("app")).toBe("postgresql://u:p%40ss%2Fw%3Ard@db.local:5432/shop");
  });

  it("явный TEST_DATABASE_URL имеет приоритет; без пароля — trust", () => {
    vi.stubEnv("TEST_DATABASE_URL", "postgresql://postgres@127.0.0.1:5432/nextjs_shop_test");
    expect(databaseUrl("test")).toBe("postgresql://postgres@127.0.0.1:5432/nextjs_shop_test");
    vi.stubEnv("TEST_DATABASE_URL", "");
    vi.stubEnv("TEST_DB_PASSWORD", "");
    vi.stubEnv("TEST_DB_PASSWORD_FILE", "/nonexistent");
    expect(databaseUrl("test")).toBe("postgresql://shop@127.0.0.1:54328/nextjs_shop_test");
  });
});

describe("safeNext", () => {
  it.each([
    ["/orders/4", "/orders/4"],
    ["/checkout?x=1", "/checkout?x=1"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["https://evil.example", "/"],
    ["/a\r\nSet-Cookie: x", "/"],
    [undefined, "/"],
    [42, "/"],
  ])("%s → %s", (value, expected) => {
    expect(safeNext(value)).toBe(expected);
  });
});
