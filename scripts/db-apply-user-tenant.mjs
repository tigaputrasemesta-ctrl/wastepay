import "dotenv/config";
import { Pool } from "pg";

const rawConnectionString = process.env.DATABASE_URL?.trim();
const connectionString = rawConnectionString?.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");

if (!connectionString) {
  console.error("❌ DATABASE_URL tidak ditemukan di environment variables!");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("🚀 Menjalankan DDL penambahan kolom tenantId pada tabel User...");

    await client.query("BEGIN");

    // 1. Tambah kolom tenantId pada tabel User jika belum ada
    await client.query(`
      ALTER TABLE "User" 
      ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
    `);

    // 2. Buat index pada kolom tenantId
    await client.query(`
      CREATE INDEX IF NOT EXISTS "User_tenantId_idx" ON "User"("tenantId");
    `);

    // 3. Tambahkan foreign key ke tabel Tenant jika belum ada
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'User_tenantId_fkey'
        ) THEN
          ALTER TABLE "User" 
            ADD CONSTRAINT "User_tenantId_fkey" 
            FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") 
            ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 4. Backfill data pengguna yang sudah ada:
    // a. Superadmin diarahkan ke platform core (tenant-core-o2w)
    const resSuperadmin = await client.query(`
      UPDATE "User" 
      SET "tenantId" = 'tenant-core-o2w' 
      WHERE "role" = 'superadmin' AND ("tenantId" IS NULL OR "tenantId" = '');
    `);
    console.log(`✅ Backfill Superadmin (${resSuperadmin.rowCount} user) -> tenant-core-o2w`);

    // b. Seluruh akun operasional eksisting (admin, kasir, petugas) diarahkan ke UPS HERU (tenant-pilot-upsheru)
    const resOps = await client.query(`
      UPDATE "User" 
      SET "tenantId" = 'tenant-pilot-upsheru' 
      WHERE "tenantId" IS NULL OR "tenantId" = '';
    `);
    console.log(`✅ Backfill Petugas/Admin Ops (${resOps.rowCount} user) -> tenant-pilot-upsheru`);

    await client.query("COMMIT");
    console.log("✅ Sukses migrasi dan backfill tenantId pada tabel User!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Gagal migrasi User tenantId:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
