import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { generateNoInvoice } from "../src/lib/invoice.js";
import { hitungJatuhTempoKonsumen } from "../src/lib/tagihan.js";

const rawConnectionString = process.env.DATABASE_URL?.trim();

if (!rawConnectionString) {
  console.error("❌ ERROR: DATABASE_URL belum diatur.");
  console.error("Jalankan dengan:");
  console.error('  DATABASE_URL="postgresql://..." node scripts/auto-approve-calon.mjs');
  process.exit(1);
}

const connectionString = rawConnectionString.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");
const pool = new Pool({
  connectionString,
  max: 2,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function autoApprove() {
  console.log("🔍 Memeriksa pendaftar calon pelanggan di database...");

  // Ambil semua calon pelanggan aktif (bukan soft-deleted)
  const calonList = await prisma.pelanggan.findMany({
    where: {
      status: "calon",
      deletedAt: null,
    },
    include: {
      wilayah: {
        include: {
          zona: true,
        },
      },
      kelurahan: true,
      paket: true,
      jadwal: {
        where: { aktif: true },
        include: { rute: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`📋 Total calon pelanggan ditemukan: ${calonList.length}`);

  if (calonList.length === 0) {
    console.log("✓ Tidak ada calon pelanggan yang menunggu approval.");
    return;
  }

  let approvedCount = 0;
  let skippedCount = 0;

  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  for (const p of calonList) {
    // Kriteria: Apakah sudah memiliki zona?
    const hasZona = Boolean(
      p.wilayah?.zonaId ||
      p.wilayah?.zona?.id ||
      p.jadwal?.[0]?.rute?.zonaId
    );

    const zonaNama = p.wilayah?.zona?.nama || "Zona Terkait";

    if (!hasZona) {
      console.log(`⏭️  [SKIP] "${p.nama}" (${p.kodePelanggan}) - Belum ada penetapan zona pickup.`);
      skippedCount++;
      continue;
    }

    console.log(`⚡ [APPROVE] Memproses "${p.nama}" (${p.kodePelanggan}) - Zona: ${zonaNama}...`);

    try {
      // 1. Update status menjadi 'aktif'
      await prisma.pelanggan.update({
        where: { id: p.id },
        data: { status: "aktif" },
      });

      // 2. Buat tagihan perdana jika belum ada
      const existingTagihan = await prisma.tagihan.findUnique({
        where: { pelangganId_bulan_tahun: { pelangganId: p.id, bulan, tahun } },
      });

      let tagihanBaru = null;
      if (!existingTagihan) {
        let tarif = p.customTarif;
        if (!tarif && p.paket?.harga) {
          tarif = p.paket.harga;
        }
        if (!tarif) {
          const kt = await prisma.kategoriTarif.findUnique({
            where: { kategori: p.kategori },
          });
          tarif = kt?.tarif ?? 40000;
        }

        tagihanBaru = await prisma.tagihan.create({
          data: {
            pelangganId: p.id,
            bulan,
            tahun,
            jumlah: tarif,
            status: "belum_bayar",
            jatuhTempo: hitungJatuhTempoKonsumen(p.createdAt, bulan, tahun),
            keterangan: `Tagihan perdana (Approval Otomatis Sistem)`,
            noInvoice: generateNoInvoice(p.kodePelanggan, bulan, tahun),
          },
        });
      }

      // 3. Catat audit log
      await prisma.auditLog.create({
        data: {
          aksi: "update",
          entitas: "Pelanggan",
          entitasId: p.id,
          dataLama: JSON.stringify({ status: "calon" }),
          dataBaru: JSON.stringify({ status: "aktif", zonaId: p.wilayah?.zonaId }),
        },
      });

      console.log(`   ✅ Selesai di-approve & aktif (Invoice: ${tagihanBaru?.noInvoice || existingTagihan?.noInvoice || "Sudah ada"})`);
      approvedCount++;
    } catch (err) {
      console.error(`   ❌ Gagal memproses ${p.nama}:`, err?.message || err);
    }
  }

  console.log("\n==========================================");
  console.log("📊 RINGKASAN PROSES APPROVAL:");
  console.log(`- Total Calon Diperiksa : ${calonList.length}`);
  console.log(`- Berhasil Di-Approve   : ${approvedCount}`);
  console.log(`- Dilewati (Tanpa Zona) : ${skippedCount}`);
  console.log("==========================================");
}

autoApprove()
  .catch((err) => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
