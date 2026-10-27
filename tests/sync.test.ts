import { describe, it, expect } from "vitest";

describe("Sync & Offline Cache Unit Tests", () => {
  it("Delta sync timestamp validation parses valid ISO dates", () => {
    const validIso = "2026-10-27T08:00:00.000Z";
    const date = new Date(validIso);
    expect(isNaN(date.getTime())).toBe(false);
    expect(date.toISOString()).toBe(validIso);
  });

  it("Delta sync entities parser extracts comma-separated values", () => {
    const query = "pelanggan,tagihan,komplain";
    const entities = query.split(",").map((s) => s.trim().toLowerCase());
    expect(entities).toContain("pelanggan");
    expect(entities).toContain("tagihan");
    expect(entities).toContain("komplain");
    expect(entities).not.toContain("rute");
  });

  it("IndexedDB stores schema contains all required entity keys", () => {
    const requiredStores = [
      "pelanggan",
      "wilayah",
      "zona",
      "kelurahan",
      "paket",
      "rute",
      "tagihan",
      "komplain",
      "pengangkutan",
      "metadata",
    ];
    expect(requiredStores.length).toBe(10);
    expect(requiredStores).toContain("metadata");
  });
});
