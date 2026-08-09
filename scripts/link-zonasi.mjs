// Link zonasi: sinkronkan wilayah RT RTRW ke database WastePay.
// 1) Buat/update Wilayah untuk 63 RT RTRW Kota Depok (referensi zonasi).
// 2) Update kelurahan/kecamatan Wilayah area lama dari RT RTRW terdekat (jika kosong).
// NON-DESTRUKTIF: tidak menghapus data, aman dijalankan berulang.
//
// Jalankan: node scripts/link-zonasi.mjs
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Koneksi ke DATABASE_URL (Supabase Postgres di production, bisa juga dev.db lokal).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const __dirname = dirname(fileURLToPath(import.meta.url));
const RT = JSON.parse(
  readFileSync(join(__dirname, "..", "src", "lib", "geojson", "rt-rtrw-depok.json"), "utf8")
);

function haversine(a, b) {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function rtTerdekat(lat, lng) {
  let best = null;
  for (const rt of RT) {
    const d = haversine([lat, lng], [rt.lat, rt.lng]);
    if (!best || d < best.d) best = { rt, d };
  }
  return best;
}

async function main() {
  // 1) Wilayah per RT RTRW
  let dibuat = 0;
  let update = 0;
  for (const rt of RT) {
    const nama = `RT RTRW #${rt.id} — KEL ${rt.kelurahan.toUpperCase()}`;
    const ada = await prisma.wilayah.findFirst({ where: { nama } });
    if (ada) {
      // update referensi kalau berubah
      if (ada.rt !== rt.id || ada.kelurahan !== rt.kelurahan || ada.kecamatan !== rt.kecamatan) {
        await prisma.wilayah.update({
          where: { id: ada.id },
          data: { rt: rt.id, kelurahan: rt.kelurahan, kecamatan: rt.kecamatan, kota: "Kota Depok" },
        });
        update++;
      }
      continue;
    }
    await prisma.wilayah.create({
      data: {
        nama,
        rt: rt.id,
        rw: null,
        kelurahan: rt.kelurahan,
        kecamatan: rt.kecamatan,
        kota: "Kota Depok",
      },
    });
    dibuat++;
  }
  console.log(`RT RTRW wilayah: ${dibuat} dibuat, ${update} diupdate, total ${RT.length}`);

  // 2) Update Wilayah area lama yang kelurahan/kecamatannya kosong
  const kosong = await prisma.wilayah.findMany({
    where: { OR: [{ kelurahan: null }, { kecamatan: null }] },
  });
  let diisi = 0;
  for (const w of kosong) {
    const pelanggan = await prisma.pelanggan.findFirst({
      where: { wilayahId: w.id, latitude: { not: null }, longitude: { not: null } },
    });
    if (pelanggan && pelanggan.latitude != null && pelanggan.longitude != null) {
      const { rt } = rtTerdekat(pelanggan.latitude, pelanggan.longitude);
      await prisma.wilayah.update({
        where: { id: w.id },
        data: { kelurahan: rt.kelurahan, kecamatan: rt.kecamatan, kota: "Kota Depok" },
      });
      diisi++;
      console.log(`  Wilayah "${w.nama}" -> KEL ${rt.kelurahan}, KEC ${rt.kecamatan}`);
    }
  }
  console.log(`Wilayah area lama dilengkapi zonasi: ${diisi}`);

  const total = await prisma.wilayah.count();
  console.log(`Total Wilayah di DB: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
