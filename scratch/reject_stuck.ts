import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const pendingDuitku = await prisma.pembayaran.findMany({
    where: {
      status: 'pending',
      metode: 'duitku',
    },
    include: { duitkuTransaction: true }
  });

  console.log(`Found ${pendingDuitku.length} pending duitku transactions`);

  let count = 0;
  for (const p of pendingDuitku) {
    if (p.duitkuTransaction?.paymentUrl?.includes('sandbox')) {
      await prisma.pembayaran.update({
        where: { id: p.id },
        data: {
          status: 'ditolak',
          catatan: 'Ditolak manual (transaksi sandbox lama)',
        }
      });
      count++;
    }
  }

  console.log(`Updated ${count} transactions to ditolak.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
