import { describe, it, expect } from "vitest";
import { DEFAULT_MARKETPLACE_PRODUCTS } from "@/lib/default-products";

describe("Marketplace Products & Fallback Invariants", () => {
  it("contains all 6 core catalog items matching landing page links", () => {
    expect(DEFAULT_MARKETPLACE_PRODUCTS.length).toBeGreaterThanOrEqual(6);

    const slugs = DEFAULT_MARKETPLACE_PRODUCTS.map((p) => p.slug);
    expect(slugs).toContain("pupuk-kompos-organik-5kg");
    expect(slugs).toContain("poc-nutrisi-tanaman-1l");
    expect(slugs).toContain("tempat-sampah-pilah-2in1");
    expect(slugs).toContain("pupuk-kompos-super-20kg");
    expect(slugs).toContain("maggot-bsf-kering-500g");
    expect(slugs).toContain("kantong-sampah-biodegradable-roll");
  });

  it("has valid prices, names, and images for all default products", () => {
    for (const p of DEFAULT_MARKETPLACE_PRODUCTS) {
      expect(p.id).toBeGreaterThan(0);
      expect(p.nama.length).toBeGreaterThan(3);
      expect(p.harga).toBeGreaterThan(0);
      expect(p.foto).toMatch(/^https?:\/\//);
      expect(p.aktif).toBe(true);
      expect(p.tenantId).toBe("tenant-pilot-upsheru");
    }
  });
});
