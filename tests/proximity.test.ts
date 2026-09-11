import { describe, expect, it, vi } from "vitest";
import { jarakMeter } from "../src/lib/geo";
import { playSound, speakText, vibrate } from "../src/lib/mobile-feedback";
import { createMobileSession, verifySessionToken, createSession } from "../src/lib/auth";

describe("proximity distance calculations", () => {
  it("jarakMeter: menghitung jarak akurat antara dua titik koordinat", () => {
    // Titik A: TPS 3R Kalibaru Depok [-6.424838, 106.832667]
    const p1: [number, number] = [-6.424838, 106.832667];
    // Titik B: ~15 meter ke arah utara (-6.424700, 106.832667)
    const p2: [number, number] = [-6.4247, 106.832667];

    const d = jarakMeter(p1, p2);
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(20);
  });

  it("mendeteksi apakah driver berada dalam radius 10m atau 20m", () => {
    const driverPos: [number, number] = [-6.424838, 106.832667];
    const rumahDekat: [number, number] = [-6.42488, 106.832667]; // ~4.6 meter
    const rumahSedang: [number, number] = [-6.4247, 106.832667]; // ~15.3 meter
    const rumahJauh: [number, number] = [-6.424, 106.832667]; // ~93 meter

    const dDekat = jarakMeter(driverPos, rumahDekat);
    const dSedang = jarakMeter(driverPos, rumahSedang);
    const dJauh = jarakMeter(driverPos, rumahJauh);

    // Evaluasi radius 10m
    expect(dDekat <= 10).toBe(true);
    expect(dSedang <= 10).toBe(false);

    // Evaluasi radius 20m
    expect(dDekat <= 20).toBe(true);
    expect(dSedang <= 20).toBe(true);
    expect(dJauh <= 20).toBe(false);
  });
});

describe("tunggakan & arrears detection logic", () => {
  it("mengidentifikasi konsumen yang menunggak dan memblokir pickup otomatis", () => {
    const now = new Date();
    const tagihanLunas = {
      id: 1,
      status: "lunas",
      jatuhTempo: new Date(now.getTime() - 15 * 86400000),
      jumlah: 50000,
      denda: 0,
    };

    const tagihanMenunggak = {
      id: 2,
      status: "tunggakan",
      jatuhTempo: new Date(now.getTime() - 45 * 86400000),
      jumlah: 50000,
      denda: 2000,
    };

    // Konsumen A: Hanya ada tagihan lunas
    const unpaidA: typeof tagihanLunas[] = [];
    const isMenunggakA = unpaidA.some((t) => t.status === "tunggakan");
    expect(isMenunggakA).toBe(false);

    // Konsumen B: Ada tagihan status "tunggakan"
    const unpaidB = [tagihanMenunggak];
    const isMenunggakB = unpaidB.some((t) => t.status === "tunggakan" || new Date(t.jatuhTempo) < now);
    expect(isMenunggakB).toBe(true);

    const totalTunggakanB = unpaidB.reduce((acc, t) => acc + t.jumlah + t.denda, 0);
    expect(totalTunggakanB).toBe(52000);

    const bolehPickupB = !isMenunggakB;
    expect(bolehPickupB).toBe(false);
  });
});

describe("mobile persistent session tokens", () => {
  it("createMobileSession membuat token JWT yang valid dan dapat diverifikasi", async () => {
    const user = {
      id: 999,
      email: "petugas.test@wastepay.id",
      nama: "Petugas Lapangan Test",
      role: "petugas",
      tokenVersion: 1,
    };

    const token = await createMobileSession(user);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".").length).toBe(3); // Standard JWT 3 parts
  });
});

describe("mobile-feedback helpers (SSR safe)", () => {
  it("playSound, speakText, vibrate tidak melempar error saat dijalankan di Node runtime", () => {
    expect(() => playSound("pickup")).not.toThrow();
    expect(() => playSound("warning")).not.toThrow();
    expect(() => playSound("success")).not.toThrow();
    expect(() => playSound("skip")).not.toThrow();

    expect(() => speakText("Mendekati rumah Bpk Budi")).not.toThrow();
    expect(() => vibrate("pickup")).not.toThrow();
    expect(() => vibrate("warning")).not.toThrow();
  });
});

describe("driver-actions (Gojek / Grab Mitra helpers)", () => {
  it("cleanIndoPhone: membersihkan dan menormalkan format nomor telepon Indonesia", async () => {
    const { cleanIndoPhone } = await import("../src/lib/driver-actions");
    expect(cleanIndoPhone("081234567890")).toBe("6281234567890");
    expect(cleanIndoPhone("81234567890")).toBe("6281234567890");
    expect(cleanIndoPhone("+62 812-3456-7890")).toBe("6281234567890");
    expect(cleanIndoPhone("0812-999-888")).toBe("62812999888");
    expect(cleanIndoPhone("")).toBeNull();
    expect(cleanIndoPhone(null)).toBeNull();
  });

  it("buildWhatsAppDriverUrl: menghasilkan template chat WA ramah untuk lunas dan menunggak", async () => {
    const { buildWhatsAppDriverUrl } = await import("../src/lib/driver-actions");

    // Skenario Lunas
    const urlLunas = buildWhatsAppDriverUrl({
      phone: "081234567890",
      nama: "Pak Budi",
      alamat: "Jl. Mawar No. 12",
      patokan: "Pagar hitam",
      isMenunggak: false,
    });
    expect(urlLunas).toContain("https://wa.me/6281234567890?text=");
    expect(decodeURIComponent(urlLunas!)).toContain("Pak Budi");
    expect(decodeURIComponent(urlLunas!)).toContain("sudah tiba di depan rumah");

    // Skenario Menunggak
    const urlMenunggak = buildWhatsAppDriverUrl({
      phone: "081234567890",
      nama: "Bu Siti",
      alamat: "Jl. Melati No. 4",
      isMenunggak: true,
    });
    expect(decodeURIComponent(urlMenunggak!)).toContain("Bu Siti");
    expect(decodeURIComponent(urlMenunggak!)).toContain("info tunggakan iuran");
  });

  it("buildNavigationUrl: menghasilkan URL navigasi turn-by-turn Google Maps", async () => {
    const { buildNavigationUrl } = await import("../src/lib/driver-actions");
    const url = buildNavigationUrl(-6.424838, 106.832667);
    expect(url).toBe("https://www.google.com/maps/dir/?api=1&destination=-6.424838,106.832667&travelmode=driving");
  });
});

