require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const pelanggans = await prisma.pelanggan.findMany({
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: {
      wilayah: { include: { zona: true } },
      jadwal: { include: { rute: true } }
    }
  });
  console.log(JSON.stringify(pelanggans, null, 2));
}
main().finally(() => prisma.$disconnect());
