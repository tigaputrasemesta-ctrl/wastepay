import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { generateNoInvoice, formatRupiahSkylite } from "../src/lib/invoice-format";
import { kirimWhatsApp, sleep } from "../src/lib/wa";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, ""),
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🚀 Memulai proses aktivasi calon pelanggan & penerbitan tagihan Oktober 2026...\n");

  const calonList = await prisma.pelanggan.findMany({
    where: {
      status: "calon",
      deletedAt: null,
    },
    include: {
      wilayah: { include: { zona: true } },
      kelurahan: true,
      paket: true,
    },
    orderBy: { id: "asc" },
  });

  console.log(`Ditemukan ${calonList.length} calon pelanggan untuk diproses.\n`);

  if (calonList.length === 0) {
    console.log("Tidak ada calon pelanggan yang perlu diaktifkan.");
    return;
  }

  const bulan = 10;
  const tahun = 2026;
  const jatuhTempo = new Date(2026, 9, 31, 23, 59, 59); // 31 Oktober 2026

  let suksesAktivasi = 0;
  let suksesTagihan = 0;
  let suksesNotif = 0;
  let gagalNotif = 0;

  for (let i = 0; i < calonList.length; i++) {
    const c = calonList[i];
    const no = i + 1;
    console.log(`[${no}/${calonList.length}] Memproses ${c.nama} (ID: ${c.id}, Telp: ${c.noTelepon})...`);

    // 1. Tentukan tarif
    let tarif = c.customTarif;
    if (!tarif && c.paket) {
      tarif = c.paket.harga;
    }
    if (!tarif || tarif <= 0) {
      if (c.kategori === "level_2") {
        tarif = 100000;
      } else {
        tarif = 40000; // Standar retribusi perumahan warga
      }
    }

    // 2. Update status pelanggan menjadi aktif & simpan customTarif definitif
    await prisma.pelanggan.update({
      where: { id: c.id },
      data: {
        status: "aktif",
        customTarif: tarif,
      },
    });
    suksesAktivasi++;

    // 3. Buat Tagihan Oktober 2026 jika belum ada
    const existing = await prisma.tagihan.findUnique({
      where: {
        pelangganId_bulan_tahun: {
          pelangganId: c.id,
          bulan,
          tahun,
        },
      },
    });

    let tagihan = existing;
    if (!existing) {
      const kode = c.kodePelanggan || c.noTelepon;
      const noInvoice = generateNoInvoice(kode, bulan, tahun);

      tagihan = await prisma.tagihan.create({
        data: {
          pelangganId: c.id,
          bulan,
          tahun,
          jumlah: tarif,
          status: "belum_bayar",
          jatuhTempo,
          keterangan: "Tagihan perdana (Aktivasi Layanan Oktober 2026)",
          noInvoice,
        },
      });
      suksesTagihan++;
    }

    const noInvoice = tagihan?.noInvoice || generateNoInvoice(c.kodePelanggan || c.noTelepon, bulan, tahun);
    const namaZona = c.wilayah?.zona?.nama || c.wilayah?.nama || "Area Layanan Depok";

    // 4. Susun pesan notifikasi aktivasi & tagihan resmi
    const pesanWa = [
      `*PENDAFTARAN DISETUJUI & AKTIVASI LAYANAN ✅*`,
      ``,
      `Halo *Bpk/Ibu ${c.nama}*,`,
      `Alhamdulillah, pendaftaran layanan pengangkutan sampah Anda bersama UPS HERU telah resmi *DISETUJUI & AKTIF*! 🎉`,
      ``,
      `Sistem kami telah menerbitkan invoice tagihan perdana untuk periode *Oktober 2026*:`,
      ``,
      `🆔 *ID Pelanggan* : *${c.kodePelanggan || c.noTelepon}*`,
      `📍 *Zona Layanan* : *${namaZona}*`,
      `🗓️ *Periode Tagihan* : *Oktober 2026*`,
      `💰 *Total Tagihan* : *${formatRupiahSkylite(tarif)}*`,
      `📅 *Batas Pembayaran* : *31 Oktober 2026*`,
      ``,
      `💳 *Pembayaran Online Mandiri (QRIS / VA / e-Wallet):*`,
      `Silakan klik tautan resmi di bawah ini untuk melihat rincian tagihan dan melakukan pembayaran otomatis:`,
      `👉 *https://upsheru.com/bayar-tagihan?invoice=${encodeURIComponent(noInvoice)}*`,
      `_(Atau melalui portal cepat: https://upsheru.com/bayar?kode=${c.noTelepon})_`,
      ``,
      `📢 *Pusat Pengaduan & Layanan Armada:*`,
      `Jika armada sampah belum mengangkut atau terdapat sampah menumpuk, Anda dapat melapor secara real-time di:`,
      `👉 *https://upsheru.com/pengaduan*`,
      ``,
      `Terima kasih atas partisipasi aktif Anda dalam menjaga kebersihan lingkungan bersama UPS HERU. 🙏`,
      ``,
      `__`,
      `*UPS HERU (WastePay Depok)*`,
      `🌐 _www.upsheru.com_`,
    ].join("\n");

    // 5. Kirim WhatsApp jika nomor tersedia
    if (c.noTelepon) {
      try {
        const kirimRes = await kirimWhatsApp(c.noTelepon, pesanWa);
        const statusNotif = kirimRes.ok ? "terkirim" : "gagal";

        if (kirimRes.ok) {
          suksesNotif++;
          console.log(`   -> WA berhasil terkirim ke ${c.noTelepon}`);
        } else {
          gagalNotif++;
          console.error(`   -> WA gagal terkirim ke ${c.noTelepon}: ${kirimRes.error}`);
        }

        // Catat ke riwayat tabel notifikasi
        await prisma.notifikasi.create({
          data: {
            tipe: "tagihan_baru",
            judul: `Aktivasi & Tagihan Oktober 2026 — ${c.nama}`,
            pesan: pesanWa,
            penerima: c.noTelepon,
            status: statusNotif,
            error: kirimRes.error || null,
            dikirimPada: kirimRes.ok ? new Date() : null,
            pelangganId: c.id,
          },
        });
      } catch (errWa: any) {
        gagalNotif++;
        console.error(`   -> Exception WA ke ${c.noTelepon}:`, errWa.message);
      }
    }

    // Anti-spam delay 1200ms
    await sleep(1200);
  }

  console.log("\n==========================================");
  console.log("🎉 SELESAI PROSES AKTIVASI & PENERBITAN TAGIHAN");
  console.log(`Total Pelanggan Diaktifkan : ${suksesAktivasi}`);
  console.log(`Total Tagihan Diterbitkan   : ${suksesTagihan}`);
  console.log(`Total WA Berhasil Terkirim  : ${suksesNotif}`);
  console.log(`Total WA Gagal              : ${gagalNotif}`);
  console.log("==========================================\n");
}

main()
  .catch((err) => {
    console.error("FATAL ERROR:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
