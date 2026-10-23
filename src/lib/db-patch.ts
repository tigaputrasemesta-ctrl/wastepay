import { prisma } from "@/lib/prisma";

let isPatchDone = false;

/**
 * Self-healing schema migration: memastikan kolom kendaraanId dan foreign key
 * pada tabel Rute sudah ada di PostgreSQL production tanpa perlu manual migration.
 */
export async function ensureArmadaRuteSchema() {
  if (isPatchDone) return;
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public."Rute" ADD COLUMN IF NOT EXISTS "kendaraanId" INTEGER;
      CREATE INDEX IF NOT EXISTS "Rute_kendaraanId_idx" ON public."Rute"("kendaraanId");
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Rute_kendaraanId_fkey'
        ) THEN
          ALTER TABLE public."Rute"
          ADD CONSTRAINT "Rute_kendaraanId_fkey"
          FOREIGN KEY ("kendaraanId") REFERENCES public."Kendaraan"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    isPatchDone = true;
  } catch (err) {
    console.warn("[ensureArmadaRuteSchema] notice:", err);
  }
}
