const { Client } = require("pg");
const rawConnectionString = process.env.DATABASE_URL || "postgresql://postgres.melqztzdrcsiiimrwhky:WastePay2026SecurePass!@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require";
const connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

const sql = `
CREATE TABLE IF NOT EXISTS "Artikel" (
  "id" SERIAL NOT NULL,
  "slug" TEXT NOT NULL,
  "judul" TEXT NOT NULL,
  "isi" TEXT NOT NULL,
  "kategori" TEXT NOT NULL DEFAULT 'edukasi',
  "gambar" TEXT,
  "diterbitkan" BOOLEAN NOT NULL DEFAULT false,
  "penulisId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Artikel_pkey" PRIMARY KEY ("id")
);

-- Indexes might exist so IF NOT EXISTS is not standard for CREATE INDEX in PG older versions, but we can try 
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Artikel_slug_key') THEN
        CREATE UNIQUE INDEX "Artikel_slug_key" ON "Artikel"("slug");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Artikel_slug_idx') THEN
        CREATE INDEX "Artikel_slug_idx" ON "Artikel"("slug");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Artikel_diterbitkan_createdAt_idx') THEN
        CREATE INDEX "Artikel_diterbitkan_createdAt_idx" ON "Artikel"("diterbitkan", "createdAt");
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Artikel_penulisId_fkey'
    ) THEN
        ALTER TABLE "Artikel" ADD CONSTRAINT "Artikel_penulisId_fkey" FOREIGN KEY ("penulisId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
`;

async function run() {
  try {
    await client.connect();
    await client.query(sql);
    console.log("Migration for Artikel successful.");
  } catch (err) {
    console.error("Error running migration:", err);
  } finally {
    await client.end();
  }
}
run();
