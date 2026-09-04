const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Deleting related data first...");
  await prisma.pembayaran.deleteMany();
  await prisma.duitkuTransaction.deleteMany();
  await prisma.tagihan.deleteMany();
  await prisma.pengangkutan.deleteMany();
  await prisma.komplain.deleteMany();
  await prisma.jadwal.deleteMany();
  await prisma.notifikasi.deleteMany();
  await prisma.liburSementara.deleteMany();
  
  console.log("Deleting all pelanggan...");
  await prisma.pelanggan.deleteMany();
  
  console.log("All pelanggan data deleted.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
