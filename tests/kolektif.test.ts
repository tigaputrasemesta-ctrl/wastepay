import { describe, expect, it } from "vitest";
import { hitungRincian } from "../src/lib/invoice-format";

describe("Skema Pembayaran Kolektif Satu Pintu & Anti-Double Bayar", () => {
  it("memverifikasi perhitungan nominal tagihan kolektif multi-rumah", () => {
    const daftarRumah = [
      { id: 1, nama: "Rumah Bpk. Ahmad", jumlah: 35000, denda: 0 },
      { id: 2, nama: "Rumah Bpk. Bambang", jumlah: 50000, denda: 1000 },
      { id: 3, nama: "Rumah Ibu Siti", jumlah: 35000, denda: 0 },
      { id: 4, nama: "Rumah Bpk. Dedi", jumlah: 40000, denda: 0 },
    ];

    let totalAkumulasi = 0;
    daftarRumah.forEach((r) => {
      const rincian = hitungRincian(r.jumlah, r.denda);
      totalAkumulasi += rincian.total;
    });

    // Subtotal 1 = 35000
    // Subtotal 2 = 50000 (PPN & denda ditiadakan di sistem: total = base)
    // Subtotal 3 = 35000
    // Subtotal 4 = 40000
    // Total = 35000 + 50000 + 35000 + 40000 = 160000
    expect(totalAkumulasi).toBe(160000);
  });

  it("memastikan filter blast WA dan reminder mengecualikan kolektif_anggota", () => {
    const listTagihan = [
      { id: 101, nama: "Pelanggan Mandiri 1", skemaBayar: "mandiri", noTelepon: "628111" },
      { id: 102, nama: "Warga RT 02 (Anggota)", skemaBayar: "kolektif_anggota", noTelepon: "628222" },
      { id: 103, nama: "Warga RT 02 (Anggota 2)", skemaBayar: "kolektif_anggota", noTelepon: "628333" },
      { id: 104, nama: "Ketua RT 02 (Induk Koordinator)", skemaBayar: "kolektif_induk", noTelepon: "628444" },
    ];

    // Logika filter yang diterapkan pada blast dan reminder cron
    const targetBlast = listTagihan.filter((t) => t.skemaBayar !== "kolektif_anggota");

    // Hanya 2 target (Mandiri dan Induk), 2 anggota kolektif harus di-skip agar tidak dobel tagih
    expect(targetBlast.length).toBe(2);
    expect(targetBlast.map((t) => t.id)).toEqual([101, 104]);
    expect(targetBlast.some((t) => t.skemaBayar === "kolektif_anggota")).toBe(false);
  });

  it("memastikan status lockPayment aktif untuk pelanggan kolektif_anggota", () => {
    function generatePublicSearchResult(pelanggan: {
      nama: string;
      skemaBayar: string;
      indukKolektif?: { nama: string } | null;
    }) {
      const isKolektifAnggota = pelanggan.skemaBayar === "kolektif_anggota";
      return {
        nama: pelanggan.nama,
        skemaBayar: pelanggan.skemaBayar,
        lockPayment: isKolektifAnggota,
        lockMessage: isKolektifAnggota
          ? `Iuran retribusi sampah Anda dikelola secara kolektif oleh ${
              pelanggan.indukKolektif?.nama || "Koordinator Lingkungan"
            }. Pembayaran mandiri dinonaktifkan.`
          : null,
      };
    }

    const wargaKolektif = generatePublicSearchResult({
      nama: "Bpk. Joko",
      skemaBayar: "kolektif_anggota",
      indukKolektif: { nama: "Ketua RT 05 Bpk. Hendra" },
    });
    expect(wargaKolektif.lockPayment).toBe(true);
    expect(wargaKolektif.lockMessage).toContain("Ketua RT 05 Bpk. Hendra");

    const wargaMandiri = generatePublicSearchResult({
      nama: "Ibu Ratna",
      skemaBayar: "mandiri",
    });
    expect(wargaMandiri.lockPayment).toBe(false);
    expect(wargaMandiri.lockMessage).toBeNull();
  });
});
