// Tambah entitas Zona (zona area pengambilan sampah per kelurahan) + ZonaPetugas
// (penugasan petugas angkut per zona, siap dipakai nanti) + Wilayah.zonaId.
// AMAN & IDEMPOTENT: hanya DDL aditif, tidak mengubah data lama.
//
// Jalankan: node scripts/add-zona.mjs
import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
});

const SQL = `
CREATE TABLE IF NOT EXISTS "Zona" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "keterangan" TEXT,
    "warna" TEXT,
    "kelurahanId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "Zona_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Zona_kelurahanId_idx" ON "Zona"("kelurahanId");
CREATE INDEX IF NOT EXISTS "Zona_deletedAt_idx" ON "Zona"("deletedAt");

CREATE TABLE IF NOT EXISTS "ZonaPetugas" (
    "id" SERIAL NOT NULL,
    "zonaId" INTEGER NOT NULL,
    "petugasId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ZonaPetugas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ZonaPetugas_zonaId_petugasId_key" ON "ZonaPetugas"("zonaId", "petugasId");
CREATE INDEX IF NOT EXISTS "ZonaPetugas_petugasId_idx" ON "ZonaPetugas"("petugasId");

ALTER TABLE "Wilayah" ADD COLUMN IF NOT EXISTS "zonaId" INTEGER;
CREATE INDEX IF NOT EXISTS "Wilayah_zonaId_idx" ON "Wilayah"("zonaId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Zona_kelurahanId_fkey') THEN
    ALTER TABLE "Zona" ADD CONSTRAINT "Zona_kelurahanId_fkey"
      FOREIGN KEY ("kelurahanId") REFERENCES "Kelurahan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Wilayah_zonaId_fkey') THEN
    ALTER TABLE "Wilayah" ADD CONSTRAINT "Wilayah_zonaId_fkey"
      FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ZonaPetugas_zonaId_fkey') THEN
    ALTER TABLE "ZonaPetugas" ADD CONSTRAINT "ZonaPetugas_zonaId_fkey"
      FOREIGN KEY ("zonaId") REFERENCES "Zona"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ZonaPetugas_petugasId_fkey') THEN
    ALTER TABLE "ZonaPetugas" ADD CONSTRAINT "ZonaPetugas_petugasId_fkey"
      FOREIGN KEY ("petugasId") REFERENCES "Petugas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    const zona = await client.query(`SELECT count(*)::int AS n FROM "Zona"`);
    console.log(`OK — tabel Zona dibuat (${zona.rows[0].n} baris, masih kosong)`);
    console.log("Zona bisa dikelola dari menu Zona (admin).");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
