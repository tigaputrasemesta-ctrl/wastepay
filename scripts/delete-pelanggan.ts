import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Menghapus data lama...");
  await prisma.duitkuTransaction.deleteMany();
  await prisma.pembayaran.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notifikasi.deleteMany();
  await prisma.komplain.deleteMany();
  await prisma.tagihan.deleteMany();
  await prisma.pengangkutan.deleteMany();
  await prisma.jadwal.deleteMany();
  await prisma.liburSementara.deleteMany();
  
  await prisma.pelanggan.deleteMany();

  console.log("Data pelanggan berhasil dihapus.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
