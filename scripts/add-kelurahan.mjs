// Tambah entitas Kelurahan + kolom kelurahanId (scope approval petugas per kelurahan).
// AMAN & IDEMPOTENT: hanya DDL aditif (CREATE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
// dan backfill yang mengisi nilai NULL saja. Tidak menghapus/mengubah data lama.
//
// Jalankan: node scripts/add-kelurahan.mjs
import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
});

const SQL = `
-- 1) Tabel Kelurahan (canonical: satu kelurahan membawahi banyak RT/wilayah)
CREATE TABLE IF NOT EXISTS "Kelurahan" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "kecamatan" TEXT,
    "kota" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Kelurahan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Kelurahan_nama_key" ON "Kelurahan"("nama");

-- 2) Kolom canonical di Wilayah & Petugas (nullable → fallback aman)
ALTER TABLE "Wilayah" ADD COLUMN IF NOT EXISTS "kelurahanId" INTEGER;
ALTER TABLE "Petugas" ADD COLUMN IF NOT EXISTS "kelurahanId" INTEGER;

-- 3) Backfill Kelurahan dari string kelurahan yang sudah ada di Wilayah
INSERT INTO "Kelurahan" ("nama", "kecamatan", "kota", "createdAt", "updatedAt")
SELECT t."nama", t."kecamatan", t."kota", NOW(), NOW()
FROM (
  SELECT DISTINCT ON (lower(trim("kelurahan")))
         trim("kelurahan") AS "nama",
         "kecamatan",
         "kota"
  FROM "Wilayah"
  WHERE "kelurahan" IS NOT NULL AND trim("kelurahan") <> ''
  ORDER BY lower(trim("kelurahan")), "id"
) t
ON CONFLICT ("nama") DO NOTHING;

-- 4) Backfill Wilayah.kelurahanId (hanya yang masih NULL)
UPDATE "Wilayah" w
SET "kelurahanId" = k."id"
FROM "Kelurahan" k
WHERE lower(trim(w."kelurahan")) = lower(k."nama")
  AND w."kelurahanId" IS NULL;

-- 5) Backfill Petugas.kelurahanId dari wilayah yang ditugaskan (hanya yang NULL)
UPDATE "Petugas" p
SET "kelurahanId" = w."kelurahanId"
FROM "Wilayah" w
WHERE p."wilayahId" = w."id"
  AND p."kelurahanId" IS NULL
  AND w."kelurahanId" IS NOT NULL;

-- 6) Foreign key (idempotent) — ON DELETE SET NULL supaya kelurahan bisa dihapus tanpa
--    menyingkirkan wilayah/petugas.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Wilayah_kelurahanId_fkey') THEN
    ALTER TABLE "Wilayah" ADD CONSTRAINT "Wilayah_kelurahanId_fkey"
      FOREIGN KEY ("kelurahanId") REFERENCES "Kelurahan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Petugas_kelurahanId_fkey') THEN
    ALTER TABLE "Petugas" ADD CONSTRAINT "Petugas_kelurahanId_fkey"
      FOREIGN KEY ("kelurahanId") REFERENCES "Kelurahan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 7) Index scope approval
CREATE INDEX IF NOT EXISTS "Wilayah_kelurahanId_idx" ON "Wilayah"("kelurahanId");
CREATE INDEX IF NOT EXISTS "Petugas_kelurahanId_idx" ON "Petugas"("kelurahanId");
`;

async function main() {
  const client = await pool.connect();
  try {
    await client.query(SQL);
    const kelurahan = await client.query(`SELECT count(*)::int AS n FROM "Kelurahan"`);
    const wilayahLinked = await client.query(
      `SELECT count(*)::int AS n FROM "Wilayah" WHERE "kelurahanId" IS NOT NULL`
    );
    const petugasLinked = await client.query(
      `SELECT count(*)::int AS n FROM "Petugas" WHERE "kelurahanId" IS NOT NULL`
    );
    console.log(`OK — Kelurahan: ${kelurahan.rows[0].n} baris`);
    console.log(`Wilayah ter-link: ${wilayahLinked.rows[0].n}`);
    console.log(`Petugas ter-link: ${petugasLinked.rows[0].n}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
