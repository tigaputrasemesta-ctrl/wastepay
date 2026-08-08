// Seed data operasional: kendaraan (dump truck/pickup/gerobak) + titik transit (lapak)
// Jalankan: node scripts/seed-operasional.mjs
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL || "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const KENDARAAN = [
  { nama: "Dump Truck 01", platNomor: "B 9812 DEK", jenis: "dump_truck", kapasitas: 6000, petugasNama: "Petugas Rudi" },
  { nama: "Dump Truck 02", platNomor: "B 9813 DEK", jenis: "dump_truck", kapasitas: 6000, petugasNama: "Bambang Haryanto" },
  { nama: "Pickup 01", platNomor: "B 9021 DZ", jenis: "pickup", kapasitas: 1500, petugasNama: "Slamet Riyadi" },
  { nama: "Pickup 02", platNomor: "B 9022 DZ", jenis: "pickup", kapasitas: 1500, petugasNama: "Joko Susilo" },
  { nama: "Gerobak 01", platNomor: null, jenis: "gerobak", kapasitas: 200, petugasNama: "Dedi Kurniawan" },
];

const TRANSIT = [
  { nama: "Lapak Beji Timur", alamat: "Jl. Raya Beji, samping Terminal Depok Lama", latitude: -6.3839, longitude: 106.8355, catatan: "Standby 05.00–09.00, truk buang ke TPA Cipayung" },
  { nama: "Lapak Kemiri Muka", alamat: "Jl. Kemiri Raya, dekat Kukusan", latitude: -6.3978, longitude: 106.8191, catatan: "Standby 06.00–10.00" },
  { nama: "Lapak Pondok Cina", alamat: "Jl. Margonda Raya km 4", latitude: -6.3656, longitude: 106.8357, catatan: "Standby 07.00–11.00" },
];

async function main() {
  const petugasAll = await prisma.petugas.findMany({ select: { id: true, nama: true } });
  const findP = (nama) => petugasAll.find((p) => p.nama === nama)?.id ?? null;

  for (const k of KENDARAAN) {
    const ada = await prisma.kendaraan.findFirst({ where: { nama: k.nama } });
    if (ada) continue;
    await prisma.kendaraan.create({
      data: { nama: k.nama, platNomor: k.platNomor, jenis: k.jenis, kapasitas: k.kapasitas, petugasId: findP(k.petugasNama) },
    });
    console.log("kendaraan +", k.nama, k.platNomor ?? "");
  }

  for (const t of TRANSIT) {
    const ada = await prisma.titikTransit.findFirst({ where: { nama: t.nama } });
    if (ada) continue;
    await prisma.titikTransit.create({ data: t });
    console.log("transit +", t.nama);
  }

  const [k, tr] = await Promise.all([prisma.kendaraan.count(), prisma.titikTransit.count()]);
  console.log(`Selesai — kendaraan: ${k}, titik transit: ${tr}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
