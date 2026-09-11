import { describe, expect, it } from "vitest";
import {
  buildTagihanWa,
  templateReminder,
  templateTunggakan,
  isWaEnabled,
} from "../src/lib/wa";

describe("Blast WA Tagihan RT", () => {
  it("buildTagihanWa menghitung total dengan PPN 11% dan menyertakan denda", () => {
    const data = {
      noInvoice: "INV-2026-09-001",
      bulan: 9,
      tahun: 2026,
      jumlah: 50000,
      denda: 5000,
      jatuhTempo: new Date("2026-09-20"),
      kodePelanggan: "PEL-001",
      paket: "Standar Rumah Tangga",
    };

    const wa = buildTagihanWa(data, "Pak RT Heru");
    // PPN 11% dari 50000 = 5500. Total = 50000 + 5500 + 5000 = 60500
    expect(wa.noInvoice).toBe("INV-2026-09-001");
    expect(wa.nama).toBe("Pak RT Heru");
    expect(wa.total).toBe(60500);
    expect(wa.denda).toBe(5000);
    expect(wa.periode).toContain("September 2026");
    expect(wa.kodePelanggan).toBe("PEL-001");
    expect(wa.paket).toBe("Standar Rumah Tangga");
  });

  it("templateReminder menghasilkan pesan pengingat tagihan dengan link bayar", () => {
    const wa = buildTagihanWa(
      {
        noInvoice: "INV-2026-09-002",
        bulan: 9,
        tahun: 2026,
        jumlah: 40000,
        denda: 0,
        jatuhTempo: "2026-09-20",
        kodePelanggan: "PEL-002",
      },
      "Ibu Siti RT 02"
    );

    const { judul, pesan } = templateReminder(wa, 3);
    expect(judul).toContain("Pengingat Tagihan");
    expect(pesan).toContain("Ibu Siti RT 02");
    expect(pesan).toContain("3 HARI LAGI");
    expect(pesan).toContain("INV-2026-09-002");
    expect(pesan).toContain("bayar-tagihan?invoice=INV-2026-09-002");
  });

  it("templateTunggakan menghasilkan pesan peringatan tunggakan tegas dengan info denda", () => {
    const wa = buildTagihanWa(
      {
        noInvoice: "INV-2026-08-099",
        bulan: 8,
        tahun: 2026,
        jumlah: 50000,
        denda: 2000,
        jatuhTempo: "2026-08-20",
        kodePelanggan: "PEL-099",
      },
      "Bpk. Ahmad RT 03"
    );

    const { judul, pesan } = templateTunggakan(wa);
    expect(judul).toContain("Menunggak");
    expect(pesan).toContain("Bpk. Ahmad RT 03");
    expect(pesan).toMatch(/denda/i);
    expect(pesan).toContain("INV-2026-08-099");
  });

  it("isWaEnabled mendeteksi ketersediaan WA_API_KEY & WA_API_URL", () => {
    const enabled = isWaEnabled();
    expect(typeof enabled).toBe("boolean");
  });
});

describe("Anniversary Cycle Billing (Siklus Jatuh Tempo Konsumen)", () => {
  it("menghitung tanggal jatuh tempo sesuai tanggal pendaftaran (contoh tgl 10)", async () => {
    const { hitungJatuhTempoKonsumen } = await import("../src/lib/tagihan");
    // Pelanggan daftar pada 10 Mei 2025
    const regDate = new Date(2025, 4, 10);
    const jtSeptember = hitungJatuhTempoKonsumen(regDate, 9, 2026);

    expect(jtSeptember.getFullYear()).toBe(2026);
    expect(jtSeptember.getMonth()).toBe(8); // September = index 8
    expect(jtSeptember.getDate()).toBe(10);
  });

  it("menyesuaikan tanggal jika bulan tagihan memiliki hari lebih sedikit (misal daftar tgl 31, tagihan Feb kabisat 2024)", async () => {
    const { hitungJatuhTempoKonsumen } = await import("../src/lib/tagihan");
    const regDate = new Date(2024, 0, 31);
    const jtFeb2024 = hitungJatuhTempoKonsumen(regDate, 2, 2024);

    expect(jtFeb2024.getFullYear()).toBe(2024);
    expect(jtFeb2024.getMonth()).toBe(1); // Februari
    expect(jtFeb2024.getDate()).toBe(29); // 2024 adalah tahun kabisat (29 hari)
  });

  it("menyesuaikan tanggal jika tagihan Feb non-kabisat (misal 2026 -> 28 hari)", async () => {
    const { hitungJatuhTempoKonsumen } = await import("../src/lib/tagihan");
    const regDate = new Date(2025, 7, 31);
    const jtFeb2026 = hitungJatuhTempoKonsumen(regDate, 2, 2026);

    expect(jtFeb2026.getFullYear()).toBe(2026);
    expect(jtFeb2026.getMonth()).toBe(1); // Februari
    expect(jtFeb2026.getDate()).toBe(28); // 2026 bukan kabisat (28 hari)
  });

  it("menyesuaikan bulan 30 hari (misal April) untuk pendaftar tgl 31", async () => {
    const { hitungJatuhTempoKonsumen } = await import("../src/lib/tagihan");
    const regDate = "2026-01-31T08:00:00.000Z";
    const jtApril = hitungJatuhTempoKonsumen(regDate, 4, 2026);

    expect(jtApril.getFullYear()).toBe(2026);
    expect(jtApril.getMonth()).toBe(3); // April
    expect(jtApril.getDate()).toBe(30);
  });

  it("fallback default ke tanggal 15 jika tanggal pendaftaran null atau invalid", async () => {
    const { hitungJatuhTempoKonsumen } = await import("../src/lib/tagihan");
    const jtNull = hitungJatuhTempoKonsumen(null, 5, 2026);
    expect(jtNull.getDate()).toBe(15);
    expect(jtNull.getMonth()).toBe(4);

    const jtInvalid = hitungJatuhTempoKonsumen("invalid-date-string", 7, 2026);
    expect(jtInvalid.getDate()).toBe(15);
    expect(jtInvalid.getMonth()).toBe(6);
  });
});
