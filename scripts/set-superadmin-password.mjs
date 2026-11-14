import "dotenv/config";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const emailOrPhone = process.argv[2] || "rekoprihartono@hero.com";
const newPassword = process.argv[3] || "Hero2026!";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const isPhone = /^\+?[0-9]{8,15}$/.test(emailOrPhone.replace(/\D/g, ""));
    const query = isPhone
      ? 'SELECT id, email, nama, role, "tokenVersion" FROM "User" WHERE "noTelepon" LIKE $1'
      : 'SELECT id, email, nama, role, "tokenVersion" FROM "User" WHERE LOWER(email) = LOWER($1)';
    const param = isPhone ? `%${emailOrPhone.replace(/\D/g, "")}%` : emailOrPhone;

    const res = await pool.query(query, [param]);
    if (res.rows.length === 0) {
      console.error(`User dengan identifier "${emailOrPhone}" tidak ditemukan.`);
      process.exit(1);
    }

    const user = res.rows[0];
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const nextTokenVersion = (user.tokenVersion || 1) + 1;

    await pool.query(
      'UPDATE "User" SET password = $1, "tokenVersion" = $2, "updatedAt" = NOW() WHERE id = $3',
      [hashedPassword, nextTokenVersion, user.id]
    );

    console.log(`✅ Berhasil reset password!`);
    console.log(`   - ID       : ${user.id}`);
    console.log(`   - Nama     : ${user.nama}`);
    console.log(`   - Email    : ${user.email}`);
    console.log(`   - Role     : ${user.role}`);
    console.log(`   - Password : ${newPassword}`);
  } catch (err) {
    console.error("Gagal reset password:", err);
  } finally {
    await pool.end();
  }
}

main();
