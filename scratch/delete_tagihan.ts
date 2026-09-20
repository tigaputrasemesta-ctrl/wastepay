import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find all tagihan where the associated pelanggan is soft-deleted
  const deletedPelangganTagihan = await prisma.tagihan.findMany({
    where: {
      pelanggan: {
        deletedAt: {
          not: null
        }
      }
    },
    select: {
      id: true,
      noInvoice: true
    }
  });

  console.log(`Found ${deletedPelangganTagihan.length} tagihan belonging to deleted pelanggan.`);

  const tagihanIdsToDelete = deletedPelangganTagihan.map(t => t.id);

  if (tagihanIdsToDelete.length > 0) {
    // Also delete any associated DuitkuTransactions first to avoid FK errors
    await prisma.duitkuTransaction.deleteMany({
      where: {
        pembayaran: {
          tagihanId: {
            in: tagihanIdsToDelete
          }
        }
      }
    });
    
    // Delete associated pembayaran first to avoid FK errors
    const pembayaranResult = await prisma.pembayaran.deleteMany({
      where: {
        tagihanId: {
          in: tagihanIdsToDelete
        }
      }
    });
    console.log(`Deleted ${pembayaranResult.count} associated pembayaran records.`);

    // Then delete the tagihan
    const result = await prisma.tagihan.deleteMany({
      where: {
        id: {
          in: tagihanIdsToDelete
        }
      }
    });
    console.log(`Deleted ${result.count} tagihan records.`);
  } else {
    console.log('No tagihan to delete based on the criteria.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
