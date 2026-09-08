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
          rtRw: true,
          patokanLokasi: true,
          kelurahan: { select: { nama: true } },
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
          verifiedBy: { select: { nama: true } },
          duitkuTransaction: { select: { orderId: true, reference: true } },
        },
      },
    },
  });

  if (!tagihan || tagihan.deletedAt) return null;
  return tagihan;
}

/**
 * Ambil semua tagihan aktif untuk satu periode (bulan/tahun) — untuk cetak
 * massal (/tagihan-cetak). Diurutkan per wilayah lalu kode pelanggan agar
 * petugas mudah mendistribusikan tagihan per blok.
 */
export async function getTagihanMassal(bulan: number, tahun: number) {
  return prisma.tagihan.findMany({
    where: {
      bulan,
      tahun,
      deletedAt: null,
    },
    include: {
      pelanggan: {
        select: {
          id: true,
          nama: true,
          noTelepon: true,
          kodePelanggan: true,
          alamat: true,
          kategori: true,
          patokanLokasi: true,
          rtRw: true,
          kelurahanId: true,
          kelurahan: { select: { nama: true } },
        },
      },
      pembayaran: {
        where: { status: "terverifikasi" },
        orderBy: { createdAt: "desc" },
        select: { id: true, metode: true, createdAt: true },
        take: 1,
      },
    },
    orderBy: [
      { pelanggan: { kelurahan: { nama: "asc" } } },
      { pelanggan: { kodePelanggan: "asc" } },
    ],
  });
}
