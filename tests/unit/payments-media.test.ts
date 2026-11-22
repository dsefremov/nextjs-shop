import { describe, expect, it } from "vitest";
import { makePng, seedOf } from "@/server/demo/seed-image";
import { detectImage, resolveMediaPath } from "@/server/media";
import { FakePaymentGateway } from "@/server/payments";

describe("тестовый платёжный шлюз", () => {
  it("«Оплатить» — успех, «Отказ» — отклонение; у каждой попытки свой номер", async () => {
    const gw = new FakePaymentGateway();
    const ok = await gw.charge(7, 100, { approve: true });
    const no = await gw.charge(7, 100, { approve: false });
    expect(ok).toMatchObject({ succeeded: true, message: "Оплата прошла успешно." });
    expect(no).toMatchObject({ succeeded: false, message: "Платёж отклонён банком (тестовый отказ)." });
    expect(ok.reference).toMatch(/^FAKE-7-[0-9A-F]{8}$/);
    expect(ok.reference).not.toBe(no.reference);
  });
});

describe("картинки", () => {
  it("тип определяется по сигнатуре, а не по имени", () => {
    expect(detectImage(makePng([10, 20, 30], 1, 16))?.ext).toBe("png");
    expect(detectImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.ext).toBe("jpg");
    expect(detectImage(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1"))?.ext).toBe("webp");
    expect(detectImage(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>"))).toBeNull();
    expect(detectImage(Buffer.from("GIF89a"))).toBeNull();
  });

  it("путь к файлу не выходит за MEDIA_ROOT", () => {
    expect(resolveMediaPath("products/a.png")).toMatch(/products\/a\.png$/);
    expect(resolveMediaPath("../secrets/db-password")).toBeNull();
    expect(resolveMediaPath("products/../../etc/passwd.png")).toBeNull();
    expect(resolveMediaPath("/etc/passwd")).toBeNull();
    expect(resolveMediaPath("products/a.svg")).toBeNull();
  });

  it("демо-картинки детерминированы", () => {
    const a = makePng([200, 100, 50], seedOf("aero"), 32);
    expect(a.equals(makePng([200, 100, 50], seedOf("aero"), 32))).toBe(true);
    expect(a.equals(makePng([200, 100, 50], seedOf("other"), 32))).toBe(false);
    expect(a.readUInt32BE(16)).toBe(32);
  });
});
