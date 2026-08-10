import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

// SSL/TLS: verifikasi sertifikat AKTIF di production (cegah MITM ke database).
// Jika provider DB memakai sertifikat yang tidak dipercaya (self-signed,
// proxy khusus), nonaktifkan eksplisit via DATABASE_SSL_REJECT_UNAUTHORIZED=false.
const pool = new Pool({
  connectionString,
  max: 10,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
      : undefined,
});
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
