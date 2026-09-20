import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const dtId = 29;
  const dt = await prisma.duitkuTransaction.findUnique({
    where: { id: dtId },
    include: { pembayaran: true },
  });
  
  if (!dt) {
    console.log("Not found");
    return;
  }
  
  console.log("Before:", dt.pembayaran.status);

  await prisma.$transaction(async (tx) => {
    await tx.pembayaran.update({
      where: { id: dt.pembayaran.id },
      data: {
        status: "ditolak",
        catatan: `Pembayaran Duitku EXPIRED`,
      },
    });
  });

  const after = await prisma.pembayaran.findUnique({
    where: { id: dt.pembayaran.id }
  });
  console.log("After:", after?.status);
}

main().catch(console.error).finally(() => prisma.$disconnect());
