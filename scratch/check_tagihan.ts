import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allTagihan = await prisma.tagihan.count();
  const deletedPelangganTagihan = await prisma.tagihan.count({
    where: {
      pelanggan: {
        deletedAt: {
          not: null
        }
      }
    }
  });
  
  const activePelangganTagihan = await prisma.tagihan.count({
    where: {
      pelanggan: {
        deletedAt: null
      }
    }
  });

  const softDeletedTagihan = await prisma.tagihan.count({
    where: {
      deletedAt: {
        not: null
      }
    }
  });

  console.log(`Total Tagihan: ${allTagihan}`);
  console.log(`Tagihan with deleted pelanggan: ${deletedPelangganTagihan}`);
  console.log(`Tagihan with active pelanggan: ${activePelangganTagihan}`);
  console.log(`Soft deleted tagihan: ${softDeletedTagihan}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
