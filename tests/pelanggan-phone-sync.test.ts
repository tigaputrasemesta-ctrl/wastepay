import { describe, expect, it } from "vitest";
import { generateNoInvoice } from "@/lib/invoice-format";

describe("Pelanggan Phone and KodePelanggan Auto-Sync Logic", () => {
  function isOldKodePhoneBased(kodePelanggan?: string | null, noTelepon?: string | null): boolean {
    if (!kodePelanggan) return false;
    const kode = kodePelanggan.trim();
    const telp = (noTelepon || "").trim();
    return Boolean(
      kode === telp ||
      kode.replace(/\D/g, "") === telp.replace(/\D/g, "") ||
      /^(08|628|\+628|\d{9,15})$/.test(kode)
    );
  }

  function resolveUpdateKode(params: {
    targetKodePelanggan: string;
    targetNoTelepon: string;
    newPhone?: string;
    newKode?: string;
    syncKodePelanggan?: boolean;
  }): { noTelepon?: string; kodePelanggan?: string } {
    const { targetKodePelanggan, targetNoTelepon, newPhone, newKode, syncKodePelanggan } = params;
    const oldKodeIsPhone = isOldKodePhoneBased(targetKodePelanggan, targetNoTelepon);
    const shouldSyncKode = syncKodePelanggan === true || (syncKodePelanggan === undefined && oldKodeIsPhone);

    let resolvedPhone = newPhone !== undefined ? newPhone.trim() : undefined;
    let resolvedKode = newKode !== undefined && newKode.trim() !== "" ? newKode.trim() : undefined;

    if (resolvedPhone !== undefined && resolvedPhone !== targetNoTelepon) {
      if (shouldSyncKode && !resolvedKode) {
        resolvedKode = resolvedPhone;
      }
    }

    return {
      ...(resolvedPhone !== undefined ? { noTelepon: resolvedPhone } : {}),
      ...(resolvedKode !== undefined ? { kodePelanggan: resolvedKode } : {}),
    };
  }

  it("mendeteksi dengan benar apakah kodePelanggan lama berbasis nomor telepon atau kode unik acak", () => {
    // Berbasis nomor telepon:
    expect(isOldKodePhoneBased("081234567890", "081234567890")).toBe(true);
    expect(isOldKodePhoneBased("6281234567890", "081234567890")).toBe(true);
    expect(isOldKodePhoneBased("+6281234567890", "6281234567890")).toBe(true);
    expect(isOldKodePhoneBased("085712345678", "085712345678")).toBe(true);

    // Kode acak legacy:
    expect(isOldKodePhoneBased("KAL-8F3K2P", "081234567890")).toBe(false);
    expect(isOldKodePhoneBased("CIL-AB79ZX", "081399998888")).toBe(false);
  });

  it("secara otomatis menyinkronkan kodePelanggan saat noTelepon salah diperbaiki oleh Admin", () => {
    const target = {
      id: 42,
      nama: "Warga Salah Input",
      noTelepon: "081234567899", // salah input digit terakhir
      kodePelanggan: "081234567899",
    };

    const updateResult = resolveUpdateKode({
      targetKodePelanggan: target.kodePelanggan,
      targetNoTelepon: target.noTelepon,
      newPhone: "6281234567890", // diperbaiki admin
    });

    expect(updateResult.noTelepon).toBe("6281234567890");
    expect(updateResult.kodePelanggan).toBe("6281234567890");
  });

  it("tidak menimpa kodePelanggan jika syncKodePelanggan disetel false (kustom)", () => {
    const target = {
      id: 55,
      nama: "Pelanggan VIP",
      noTelepon: "081111222233",
      kodePelanggan: "VIP-HERU-001",
    };

    const updateResult = resolveUpdateKode({
      targetKodePelanggan: target.kodePelanggan,
      targetNoTelepon: target.noTelepon,
      newPhone: "628999888777",
      syncKodePelanggan: false,
    });

    expect(updateResult.noTelepon).toBe("628999888777");
    expect(updateResult.kodePelanggan).toBeUndefined(); // tidak berubah
  });

  it("memungkinkan Admin menetapkan kodePelanggan eksplisit", () => {
    const target = {
      id: 77,
      nama: "Toko Sembako Jaya",
      noTelepon: "081234567890",
      kodePelanggan: "081234567890",
    };

    const updateResult = resolveUpdateKode({
      targetKodePelanggan: target.kodePelanggan,
      targetNoTelepon: target.noTelepon,
      newPhone: "6281234567890",
      newKode: "TOKO-JAYA-01",
      syncKodePelanggan: false,
    });

    expect(updateResult.noTelepon).toBe("6281234567890");
    expect(updateResult.kodePelanggan).toBe("TOKO-JAYA-01");
  });

  it("memperbarui nomor invoice pada tagihan belum_bayar dan mempertahankan tagihan lunas", () => {
    const oldKode = "081234567899";
    const newKode = "6281234567890";

    const tagihanList = [
      {
        id: 1,
        bulan: 5,
        tahun: 2026,
        status: "lunas",
        noInvoice: generateNoInvoice(oldKode, 5, 2026),
      },
      {
        id: 2,
        bulan: 6,
        tahun: 2026,
        status: "belum_bayar",
        noInvoice: generateNoInvoice(oldKode, 6, 2026),
      },
    ];

    // Simulasi sync invoice
    const updatedTagihan = tagihanList.map((tagihan) => {
      if (tagihan.status === "belum_bayar") {
        return {
          ...tagihan,
          noInvoice: generateNoInvoice(newKode, tagihan.bulan, tagihan.tahun),
        };
      }
      return tagihan;
    });

    // Tagihan lunas tidak berubah (audit trail terjaga)
    expect(updatedTagihan[0].noInvoice).toBe(`INV/${oldKode}/202605`);
    expect(updatedTagihan[0].status).toBe("lunas");

    // Tagihan belum bayar tersinkronkan ke kode baru
    expect(updatedTagihan[1].noInvoice).toBe(`INV/${newKode}/202606`);
    expect(updatedTagihan[1].status).toBe("belum_bayar");
  });
});
