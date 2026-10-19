import { describe, expect, it } from "vitest";
import {
  checkCoverageLocation,
  getCoverageData,
  BLOK_OPERASIONAL_AKTIF,
  KELURAHAN_COVERAGE_LIST,
} from "../src/lib/server/coverage-service";

describe("coverage-service: checkCoverageLocation", () => {
  it("titik di pusat Kalibaru (Setu / Dmiles) terdeteksi AKTIF", () => {
    // Koordinat Blok Setu + Rafael Pete
    const res = checkCoverageLocation(-6.44081, 106.83624);
    expect(res.status).toBe("AKTIF");
    expect(res.terlayani).toBe(true);
    expect(res.kelurahan).toBe("Kalibaru");
    expect(res.kecamatan).toBe("Cilodong");
    expect(res.jarakMeter).toBeLessThanOrEqual(50);
    expect(res.ctaText).toBe("Daftar Berlangganan Sekarang");
    expect(res.ctaUrl).toContain("/daftar?kelurahan=Kalibaru");
    expect(res.jadwalPengangkutan).toContain("Senin");
  });

  it("titik di Blok Bakung Cilodong terdeteksi AKTIF", () => {
    const res = checkCoverageLocation(-6.43454, 106.83601);
    expect(res.status).toBe("AKTIF");
    expect(res.terlayani).toBe(true);
    expect(res.kelurahan).toBe("Cilodong");
    expect(res.zonaTerdekat).toContain("Bakung");
  });

  it("titik di Blok Sasak Kalimulya terdeteksi AKTIF", () => {
    const res = checkCoverageLocation(-6.43476, 106.82466);
    expect(res.status).toBe("AKTIF");
    expect(res.terlayani).toBe(true);
    expect(res.kelurahan).toBe("Kalimulya");
  });

  it("titik di Mekar Jaya Sukmajaya terdeteksi PERLUASAN", () => {
    const res = checkCoverageLocation(-6.402, 106.84);
    expect(res.status).toBe("PERLUASAN");
    expect(res.terlayani).toBe(false);
    expect(res.statusLabel).toContain("Perluasan");
    expect(res.ctaText).toContain("Rute Baru");
  });

  it("titik di Beji / Sawangan terdeteksi TERSEDIA_SURVEI", () => {
    // Pusat Sawangan (-6.41, 106.77)
    const res = checkCoverageLocation(-6.41, 106.77);
    expect(res.status).toBe("TERSEDIA_SURVEI");
    expect(res.terlayani).toBe(false);
    expect(res.ctaText).toContain("Survei");
    expect(res.whatsappUrl).toContain("wa.me");
  });

  it("titik jauh di luar kota (Bandung / Laut Jawa) terdeteksi LUAR_KOTA", () => {
    const res = checkCoverageLocation(-6.9, 107.6);
    expect(res.status).toBe("LUAR_KOTA");
    expect(res.terlayani).toBe(false);
    expect(res.statusLabel).toContain("Luar");
  });
});

describe("coverage-service: getCoverageData", () => {
  it("mengembalikan data agregasi coverage yang lengkap", async () => {
    const data = await getCoverageData();
    expect(data.stats.totalRumahTerlayani).toBeGreaterThan(500);
    expect(data.stats.totalKelurahanAktif).toBe(4);
    expect(data.stats.totalBlokOperasional).toBe(23);
    expect(data.kelurahan.length).toBeGreaterThanOrEqual(4);
    expect(data.blokOperasional.length).toBe(BLOK_OPERASIONAL_AKTIF.length);
    expect(data.kecamatan.length).toBe(11);
    expect(data.serviceGrid.length).toBeGreaterThan(0);
    expect(data.depokBounds).toBeDefined();
  });
});
