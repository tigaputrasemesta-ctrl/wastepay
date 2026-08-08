import { describe, expect, it } from "vitest";
import {
  cariKecamatanTitik,
  deteksiZona,
  formatJarak,
  jarakMeter,
  panjangRute,
  titikDalamPoligon,
  urutkanRute,
} from "../src/lib/geo";
import { KECAMATAN_DEPOK } from "../src/lib/kecamatan-depok";
import { RT_RTRW_DEPOK, DEPOK_BOUNDS } from "../src/lib/zona-depok";

const cilodong = KECAMATAN_DEPOK.find((k) => k.kode === "3276031")!;

describe("geo: jarakMeter (haversine)", () => {
  it("jarak nol untuk titik yang sama", () => {
    expect(jarakMeter([-6.4, 106.8], [-6.4, 106.8])).toBe(0);
  });

  it("jarak 1 derajat bujur di lintang -6.4 ≈ 11,1 km", () => {
    const d = jarakMeter([-6.4, 106.8], [-6.4, 106.9]);
    expect(d).toBeGreaterThan(11000);
    expect(d).toBeLessThan(11200);
  });
});

describe("geo: titikDalamPoligon (ray casting)", () => {
  it("RT RTRW Cilodong berada di dalam polygon kecamatan Cilodong", () => {
    const rt = RT_RTRW_DEPOK.find((r) => r.kelurahan === "Cilodong")!;
    expect(titikDalamPoligon([rt.lat, rt.lng], cilodong.koordinat)).toBe(true);
  });

  it("titik di luar kota (Timur Tapos) tidak di dalam Cilodong", () => {
    expect(titikDalamPoligon([-6.4, 107.0], cilodong.koordinat)).toBe(false);
  });

  it("semua RT RTRW Depok berada di dalam batas DEPOK_BOUNDS", () => {
    for (const rt of RT_RTRW_DEPOK) {
      expect(rt.lat).toBeGreaterThanOrEqual(DEPOK_BOUNDS.minLat);
      expect(rt.lat).toBeLessThanOrEqual(DEPOK_BOUNDS.maxLat);
      expect(rt.lng).toBeGreaterThanOrEqual(DEPOK_BOUNDS.minLng);
      expect(rt.lng).toBeLessThanOrEqual(DEPOK_BOUNDS.maxLng);
    }
  });
});

describe("geo: cariKecamatanTitik", () => {
  it("pusat Cilodong → kecamatan CILODONG", () => {
    const k = cariKecamatanTitik([-6.43, 106.845]);
    expect(k?.nama).toBe("CILODONG");
  });

  it("pusat Beji → kecamatan BEJI", () => {
    const k = cariKecamatanTitik([-6.381, 106.813]);
    expect(k?.nama).toBe("BEJI");
  });

  it("titik di Bekasi → null (di luar kota)", () => {
    expect(cariKecamatanTitik([-6.3, 107.0])).toBeNull();
  });
});

describe("geo: deteksiZona (zonasi otomatis pelanggan)", () => {
  it("koordinat Beji → kelurahan BEJI, kecamatan Beji", () => {
    const z = deteksiZona([-6.381, 106.813]);
    expect(z?.kelurahan).toBe("Beji");
    expect(z?.kecamatan).toBe("Beji");
  });

  it("koordinat Pancoran Mas → kelurahan PANCORAN MAS", () => {
    const z = deteksiZona([-6.402, 106.806]);
    expect(z?.kecamatan).toBe("Pancoran Mas");
  });

  it("koordinat di tepian polygon kasar tetap terdeteksi (fallback bbox+RT)", () => {
    const z = deteksiZona([-6.436, 106.853]);
    expect(z?.kecamatan).toBe("Cilodong");
    expect(z?.jarakRtM).toBeGreaterThan(0);
  });

  it("titik di luar kota → null", () => {
    expect(deteksiZona([-6.2, 106.9])).toBeNull();
    expect(deteksiZona([-6.3, 107.0])).toBeNull();
  });
});

describe("geo: urutan & panjang rute", () => {
  it("mengurutkan titik tetangga terdekat", () => {
    const a: [number, number] = [-6.4, 106.8];
    const b: [number, number] = [-6.42, 106.82];
    const c: [number, number] = [-6.41, 106.81];
    const urut = urutkanRute([a, b, c]);
    expect(urut[0]).toEqual(a);
    expect(urut[1]).toEqual(c);
    expect(urut[2]).toEqual(b);
  });

  it("panjang rute 2 titik = jarak antar titik", () => {
    const a: [number, number] = [-6.4, 106.8];
    const b: [number, number] = [-6.4, 106.9];
    expect(panjangRute([a, b])).toBeCloseTo(jarakMeter(a, b), 6);
  });

  it("formatJarak", () => {
    expect(formatJarak(500)).toBe("500 m");
    expect(formatJarak(1500)).toBe("1.5 km");
  });
});
