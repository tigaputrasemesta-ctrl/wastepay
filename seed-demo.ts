import { prisma } from "./src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding demo users...");
  const password = await bcrypt.hash("wastepay123", 12);

  const users = [
    { email: "superadmin@wastepay.com", nama: "Demo Superadmin", role: "superadmin" },
    { email: "admin@wastepay.com", nama: "Demo Admin", role: "admin" },
    { email: "kasir@wastepay.com", nama: "Demo Kasir", role: "kasir" },
    { email: "petugas.angkut@wastepay.com", nama: "Demo Supir", role: "petugas" },
    { email: "petugas.tagih@wastepay.com", nama: "Demo Kolektor", role: "petugas" },
    { email: "petugas.survei@wastepay.com", nama: "Demo Surveyor", role: "petugas" },
    { email: "petugas.all@wastepay.com", nama: "Demo Petugas Lengkap", role: "petugas" },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role, nama: u.nama, password },
      create: {
        email: u.email,
        nama: u.nama,
        role: u.role,
        password,
        noTelepon: "08110000" + Math.floor(Math.random() * 10000),
      },
    });
    console.log(`- Created/Updated user: ${user.email}`);

    // Create Petugas for roles with "petugas"
    if (u.role === "petugas") {
      let jabatan = "angkut";
      if (u.email.includes("tagih")) jabatan = "tagih";
      else if (u.email.includes("survei")) jabatan = "survei";
      else if (u.email.includes("all")) jabatan = "angkut,tagih,survei";

      // make sure there is at least 1 wilayah
      let wilayah = await prisma.wilayah.findFirst();
      if (!wilayah) {
        wilayah = await prisma.wilayah.create({ data: { nama: "Wilayah Demo", kelurahan: "Demo", kecamatan: "Demo", kota: "Demo" } });
      }

      await prisma.petugas.upsert({
        where: { userId: user.id },
        update: { jabatan, nama: user.nama },
        create: {
          nama: user.nama,
          noTelepon: user.noTelepon || "0811",
          jabatan,
          userId: user.id,
          wilayahId: wilayah.id,
        },
      });
      console.log(`  -> Linked to Petugas (Jabatan: ${jabatan})`);
    }
  }

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
