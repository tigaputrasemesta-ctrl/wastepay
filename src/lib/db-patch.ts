import { prisma } from "@/lib/prisma";

let isPatchDone = false;

/**
 * Self-healing schema migration: memastikan kolom kendaraanId dan foreign key
 * pada tabel Rute sudah ada di PostgreSQL production tanpa perlu manual migration.
 */
export async function ensureArmadaRuteSchema() {
  if (isPatchDone) return;
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE public."Rute" ADD COLUMN IF NOT EXISTS "kendaraanId" INTEGER;`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Rute_kendaraanId_idx" ON public."Rute"("kendaraanId");`);
    isPatchDone = true;
  } catch (err) {
    console.warn("[ensureArmadaRuteSchema] notice:", err);
  }
}
