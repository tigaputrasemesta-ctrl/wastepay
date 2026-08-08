// Backfill noInvoice untuk tagihan lama yang belum punya nomor invoice.
// Format: INV/{kodePelanggan}/{YYYYMM}
// Jalankan: node scripts/backfill-no-invoice.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

function bulanTahunKey(bulan, tahun) {
  return `${tahun}${String(bulan).padStart(2, "0")}`;
}

function sanitasi(kode) {
  return String(kode || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

const tagihanList = await prisma.tagihan.findMany({
  where: { noInvoice: null, deletedAt: null },
  include: { pelanggan: { select: { kodePelanggan: true } } },
});

let updated = 0;
let skipped = 0;
for (const t of tagihanList) {
  const noInvoice = `INV/${sanitasi(t.pelanggan.kodePelanggan)}/${bulanTahunKey(t.bulan, t.tahun)}`;
  const existing = await prisma.tagihan.findUnique({ where: { noInvoice } });
  if (existing && existing.id !== t.id) {
    // konflik nomor (duplikat kode pelanggan + periode) — beri suffix
    await prisma.tagihan.update({
      where: { id: t.id },
      data: { noInvoice: `${noInvoice}-${t.id}` },
    });
    skipped++;
    continue;
  }
  await prisma.tagihan.update({ where: { id: t.id }, data: { noInvoice } });
  updated++;
}

console.log(`OK: ${updated} tagihan di-backfill, ${skipped} pakai suffix (duplikat)`);
await prisma.$disconnect();
