import { describe, expect, it } from "vitest";

function buildWaLink(phone: string, message: string): string {
  const clean = phone.replace(/[^0-9]/g, "");
  const normalized = clean.replace(/^0/, "62");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

function sanitizeRetryLimit(limit?: unknown): number {
  return Math.min(Math.max(Number(limit) || 20, 1), 50);
}

describe("Notifikasi WhatsApp Retry Logic", () => {
  it("menghasilkan link wa.me dengan format Indonesia (62xxx)", () => {
    const link = buildWaLink("0812-8405-312", "Halo Bpk Deni");
    expect(link).toBe("https://wa.me/628128405312?text=Halo%20Bpk%20Deni");
  });

  it("menangani nomor yang sudah berawalan 62", () => {
    const link = buildWaLink("628128405312", "Tagihan Lunas");
    expect(link).toBe("https://wa.me/628128405312?text=Tagihan%20Lunas");
  });

  it("sanitasi limit batch agar aman dari abuse (antara 1 s/d 50)", () => {
    expect(sanitizeRetryLimit(undefined)).toBe(20);
    expect(sanitizeRetryLimit(0)).toBe(20);
    expect(sanitizeRetryLimit(-5)).toBe(1);
    expect(sanitizeRetryLimit(100)).toBe(50);
    expect(sanitizeRetryLimit("15")).toBe(15);
  });
});
