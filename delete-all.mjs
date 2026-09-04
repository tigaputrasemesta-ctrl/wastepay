import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
  connectionTimeoutMillis: 20000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Menghapus semua data pelanggan...");
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

  console.log("Semua data pelanggan berhasil dihapus.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
