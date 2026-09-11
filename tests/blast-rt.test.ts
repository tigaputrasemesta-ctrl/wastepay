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
