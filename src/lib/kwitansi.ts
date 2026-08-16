import { prisma } from "./prisma";

/**
 * Modul kwitansi (bukti pembayaran) — pola server-only (import prisma).
 * Helper format murni tetap ada di invoice-format.ts agar aman dari komponen client.
 */

/** Format nomor kwitansi dari id pembayaran: KW-000123 */
export function formatNoKwitansi(id: number): string {
  return `KW-${String(id).padStart(6, "0")}`;
}

/** Ambil pembayaran lengkap untuk halaman kwitansi (/kwitansi/[id]). */
export async function getPembayaranById(id: number) {
  return prisma.pembayaran.findUnique({
    where: { id },
    include: {
      pelanggan: {
        select: {
          id: true,
          nama: true,
          noTelepon: true,
          kodePelanggan: true,
          alamat: true,
          kategori: true,
          kelurahanId: true,
          kelurahan: { select: { nama: true } },
        },
      },
      tagihan: {
        select: {
          id: true,
          noInvoice: true,
          bulan: true,
          tahun: true,
          jumlah: true,
          denda: true,
          keterangan: true,
          jatuhTempo: true,
        },
      },
      verifiedBy: { select: { id: true, nama: true, role: true } },
      duitkuTransaction: { select: { orderId: true, statusCode: true } },
    },
  });
}
