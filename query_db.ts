import { prisma } from './src/lib/prisma';

async function main() {
  const res = await prisma.notifikasi.groupBy({
    by: ["error"],
    _count: { id: true },
    where: { status: "gagal" }
  });
  console.log(res);
}

main().finally(() => prisma.$disconnect());
