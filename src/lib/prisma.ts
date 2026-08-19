import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const rawConnectionString = process.env.DATABASE_URL;

// Bersihkan parameter sslmode dari connectionString agar tidak menimpa konfigurasi SSL Pool
const connectionString = rawConnectionString?.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");

const isProd = process.env.NODE_ENV === "production";
const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false";

const pool = new Pool({
  connectionString,
  max: 10,
  ssl: isProd || process.env.DATABASE_SSL === "true"
    ? { rejectUnauthorized }
    : undefined,
});
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

