// Hubungkan Zona ke Rute & Pengangkutan (assignment angkut per zona).
// - Rute.zonaId (opsional): rute melayani zona tertentu di dalam kelurahan
// - Pengangkutan.zonaId (opsional): snapshot zona saat pickup (untuk laporan per zona)
import "dotenv/config";
import { Pool } from "pg";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
});
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(`ALTER TABLE "Rute" ADD COLUMN IF NOT EXISTS "zonaId" INTEGER`);
  await client.query(`ALTER TABLE "Pengangkutan" ADD COLUMN IF NOT EXISTS "zonaId" INTEGER`);

  // FK (onDelete: SetNull — zona dihapus tidak menghapus rute/riwayat pengangkutan)
  await client.query(`ALTER TABLE "Rute" DROP CONSTRAINT IF EXISTS "Rute_zonaId_fkey"`);
  await client.query(`ALTER TABLE "Rute" ADD CONSTRAINT "Rute_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
  await client.query(`ALTER TABLE "Pengangkutan" DROP CONSTRAINT IF EXISTS "Pengangkutan_zonaId_fkey"`);
  await client.query(`ALTER TABLE "Pengangkutan" ADD CONSTRAINT "Pengangkutan_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE SET NULL ON UPDATE CASCADE`);

  await client.query(`CREATE INDEX IF NOT EXISTS "Rute_zonaId_idx" ON "Rute"("zonaId")`);
  await client.query(`CREATE INDEX IF NOT EXISTS "Pengangkutan_zonaId_idx" ON "Pengangkutan"("zonaId")`);
  await client.query("COMMIT");
  console.log("OK. Rute.zonaId & Pengangkutan.zonaId ditambahkan + FK + index.");
} catch (e) {
  await client.query("ROLLBACK");
  console.error("ERR:", e.message);
} finally {
  client.release();
  await pool.end();
}
