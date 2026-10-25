import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("🚀 Memulai penyiapan akun Raka dan reset password supir/petugas...");

  const defaultPassword = "123456";
  const hashedPassword = await bcrypt.hash(defaultPassword, 12);

  // 1. Cek atau buat user Raka
  let userRaka = await prisma.user.findFirst({
    where: { email: { equals: "raka@hero.com", mode: "insensitive" } }
  });

  if (!userRaka) {
    userRaka = await prisma.user.create({
      data: {
        email: "raka@hero.com",
        password: hashedPassword,
        nama: "RAKA DRIVER",
        role: "petugas",
        aktif: true,
        tokenVersion: 1,
      }
    });
    console.log(`✅ User Raka berhasil dibuat: ID ${userRaka.id} (${userRaka.email})`);
  } else {
    userRaka = await prisma.user.update({
      where: { id: userRaka.id },
      data: {
        email: "raka@hero.com",
        password: hashedPassword,
        nama: "RAKA DRIVER",
        role: "petugas",
        aktif: true,
        tokenVersion: (userRaka.tokenVersion || 1) + 1,
      }
    });
    console.log(`ℹ️ User Raka sudah ada, password diperbarui: ID ${userRaka.id}`);
  }

  // 2. Cek atau buat profil Petugas untuk Raka
  let petugasRaka = await prisma.petugas.findFirst({
    where: {
      OR: [
        { userId: userRaka.id },
        { email: { equals: "raka@hero.com", mode: "insensitive" } },
        { nama: { contains: "raka", mode: "insensitive" } }
      ]
    }
  });

  if (!petugasRaka) {
    petugasRaka = await prisma.petugas.create({
      data: {
        nama: "RAKA DRIVER",
        noTelepon: "0812-0000-0000",
        email: "raka@hero.com",
        jabatan: "angkut,survei",
        kelurahanId: 10,
        aktif: true,
        userId: userRaka.id,
      }
    });
    console.log(`✅ Profil Petugas Raka dibuat: ID ${petugasRaka.id}`);
  } else {
    petugasRaka = await prisma.petugas.update({
      where: { id: petugasRaka.id },
      data: {
        nama: "RAKA DRIVER",
        email: "raka@hero.com",
        jabatan: "angkut,survei",
        kelurahanId: 10,
        aktif: true,
        userId: userRaka.id,
      }
    });
    console.log(`ℹ️ Profil Petugas Raka diperbarui: ID ${petugasRaka.id}`);
  }

  // 3. Tautkan Kendaraan ID 19 (GRANDMAX ASTROBOY) ke Petugas Raka
  const k19 = await prisma.kendaraan.update({
    where: { id: 19 },
    data: {
      petugasId: petugasRaka.id,
      aktif: true,
    }
  });
  console.log(`✅ Kendaraan [ID ${k19.id}] ${k19.nama} (${k19.platNomor}) kini ditugaskan ke driver: ${petugasRaka.nama}`);

  // 4. Normalisasi email supir & reset password ke "123456" untuk semua role petugas
  const petugasUsers = await prisma.user.findMany({
    where: {
      OR: [
        { role: "petugas" },
        { email: { in: ["ago@hero.com", "piat@hero.com", "PIAT@HERO.com", "awal@hero.com", "AWAL@HERO.COM", "ryan@hero.com", "raka@hero.com"] } }
      ]
    }
  });

  console.log(`\n🔑 Mereset password ${petugasUsers.length} akun petugas ke "${defaultPassword}" & normalisasi email...`);

  for (const u of petugasUsers) {
    const cleanEmail = u.email.trim().toLowerCase();
    await prisma.user.update({
      where: { id: u.id },
      data: {
        email: cleanEmail,
        password: hashedPassword,
        aktif: true,
        tokenVersion: (u.tokenVersion || 1) + 1,
      }
    });

    // Update email di profil Petugas jika ada
    await prisma.petugas.updateMany({
      where: { userId: u.id },
      data: { email: cleanEmail }
    });

    console.log(`  ✓ ID ${u.id}: ${u.nama} -> ${cleanEmail} (Password reset sukses)`);
  }

  // 5. Cek verifikasi akhir armada dan drivernya
  console.log("\n=== STATUS TERBARU 3 ARMADA UTAMA ===");
  const armadaUtama = await prisma.kendaraan.findMany({
    where: { id: { in: [20, 18, 19] } },
    include: {
      petugas: {
        include: { user: true }
      }
    },
    orderBy: { id: "asc" }
  });

  for (const a of armadaUtama) {
    console.log(`\n🚛 [Mobil ID ${a.id}] ${a.nama} (${a.platNomor})`);
    console.log(`   Driver: ${a.petugas?.nama || "Belum ditugaskan"}`);
    console.log(`   Email Login: ${a.petugas?.user?.email || a.petugas?.email || "-"}`);
    console.log(`   No Telepon: ${a.petugas?.noTelepon || "-"}`);
  }

  console.log("\n🎉 Seluruh operasi berhasil diselesaikan!");
}

main()
  .catch((e) => {
    console.error("❌ Terjadi kesalahan:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
    process.exit(0);
  });
