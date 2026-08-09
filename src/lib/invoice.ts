import { prisma } from "./prisma";

/**
 * Modul invoice — meniru pola tagihan ISP (contoh: skylite.id).
 *
 * Nomor invoice: INV/{kodePelanggan}/{YYYYMM}
 * Contoh:       INV/2602163562/202606
 *
 * Struktur halaman:
 *  - /bayar-tagihan?invoice=...  → kartu status tagihan + aksi bayar
 *  - /invoice-tagihan?invoice=... → invoice printable (PDF via window.print)
 *
 * CATATAN: helper format murni (tanpa database) dipindah ke
 * src/lib/invoice-format.ts agar aman dipakai dari komponen client.
 * Modul ini hanya untuk fungsi yang butuh Prisma (server-only).
 */
export * from "./invoice-format";

/** Ambil tagihan berdasarkan nomor invoice (untuk halaman publik) */
export async function getTagihanByNoInvoice(noInvoice: string) {
  const invoice = decodeURIComponent(noInvoice).trim();

  const tagihan = await prisma.tagihan.findUnique({
    where: { noInvoice: invoice },
    include: {
      pelanggan: {
        select: {
          id: true,
          nama: true,
          noTelepon: true,
          kodePelanggan: true,
          alamat: true,
          kategori: true,
        },
      },
      pembayaran: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          metode: true,
          status: true,
          jumlah: true,
          tanggal: true,
          createdAt: true,
        },
      },
    },
  });

  if (!tagihan || tagihan.deletedAt) return null;
  return tagihan;
}
