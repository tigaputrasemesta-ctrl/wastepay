// Rotate admin password to random value. Prints the new password once.
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL || "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const password = randomBytes(9).toString("base64url");
const hashed = await bcrypt.hash(password, 12);
await prisma.user.updateMany({
  where: { email: "admin.herozerowaste@gmail.com" },
  data: { password: hashed },
});
const admin = await prisma.user.findUnique({ where: { email: "admin.herozerowaste@gmail.com" } });
console.log(admin ? `OK: ${admin.email} — password baru: ${password}` : "admin tidak ditemukan");
await prisma.$disconnect();
