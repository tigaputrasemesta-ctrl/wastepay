import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const rawConnectionString = process.env.DATABASE_URL;

// Bersihkan parameter sslmode dari connectionString agar tidak menimpa konfigurasi SSL Pool
const connectionString = rawConnectionString?.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");

const isProd = process.env.NODE_ENV === "production";

// Konfigurasi pool pg untuk Serverless (Vercel):
// max: 2 per Lambda instance untuk mencegah terlampauinya limit koneksi Supabase.
// idleTimeoutMillis: 1000 agar koneksi segera dibebaskan kembali ke pooler.
const pool = new Pool({
  connectionString,
  max: isProd ? 2 : 5,
  idleTimeoutMillis: 1000,
  connectionTimeoutMillis: 8000,
  ssl: isProd || process.env.DATABASE_SSL === "true" || rawConnectionString?.includes("supabase.com")
    ? { rejectUnauthorized: false }
    : undefined,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
