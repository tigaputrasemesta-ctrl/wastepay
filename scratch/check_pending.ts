import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const pembayaran = await prisma.pembayaran.findMany({
    where: {
      status: 'pending',
      pelanggan: {
        nama: {
          contains: 'Rohmat',
          mode: 'insensitive'
        }
      }
    },
    include: {
      pelanggan: true,
      tagihan: true,
      duitkuTransaction: true
    }
  });

  console.log(JSON.stringify(pembayaran, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
