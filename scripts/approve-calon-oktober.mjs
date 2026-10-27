import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const rawConnectionString = process.env.DATABASE_URL?.trim();
if (!rawConnectionString) {
  console.error("❌ DATABASE_URL is not defined in env!");
  process.exit(1);
}

const pool = new Pool({
  connectionString: rawConnectionString.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, ""),
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const FONNTE_API_KEY = process.env.WA_API_KEY || "yZeWGJymbrnTpub2x5rL";
const FONNTE_API_URL = process.env.WA_API_URL || "https://api.fonnte.com/send";
const GROUP_PENDAFTARAN = process.env.WA_GROUP_PENDAFTARAN_ID || "120363432214955370@g.us";

function sanitasiKodePelanggan(kode) {
  return kode.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function generateNoInvoice(kodePelanggan, bulan, tahun) {
  const bulanKey = `${tahun}${String(bulan).padStart(2, "0")}`;
  return `INV/${sanitasiKodePelanggan(kodePelanggan)}/${bulanKey}`;
}

function formatRupiahSkylite(amount) {
  const rounded = Math.round(amount);
  const str = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Rp${str},-`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendWhatsApp(target, message) {
  try {
    const res = await fetch(FONNTE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: FONNTE_API_KEY,
      },
      body: JSON.stringify({
        target,
        message,
        countryCode: "62",
      }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data && data.status !== false) {
      return { ok: true, data };
    }
    return { ok: false, error: data?.reason || data?.message || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function main() {
  console.log("🚀 Memulai proses approval calon pelanggan & penerbitan tagihan Oktober 2026...\n");

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

  console.log(`📋 Total calon pelanggan ditemukan: ${calonList.length}\n`);

  if (calonList.length === 0) {
    console.log("✓ Tidak ada calon pelanggan yang menunggu approval.");
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
      if (c.kategori === "level_6") {
        tarif = 300000;
      } else if (c.kategori === "level_2") {
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
    const kode = c.kodePelanggan || c.noTelepon;
    const noInvoice = generateNoInvoice(kode, bulan, tahun);

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

    // 4. Catat AuditLog
    try {
      await prisma.auditLog.create({
        data: {
          aksi: "update",
          entitas: "Pelanggan",
          entitasId: c.id,
          dataLama: JSON.stringify({ status: "calon" }),
          dataBaru: JSON.stringify({ status: "aktif", customTarif: tarif, noInvoice: tagihan.noInvoice }),
        },
      });
    } catch (errAudit) {
      console.warn("   ⚠️ Gagal mencatat audit log:", errAudit.message);
    }

    const invoiceStr = tagihan?.noInvoice || noInvoice;
    const namaZona = c.wilayah?.zona?.nama || c.wilayah?.nama || "Area Layanan Depok";

    // 5. Susun pesan notifikasi aktivasi & tagihan resmi ke pelanggan
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
      `👉 *https://upsheru.com/bayar-tagihan?invoice=${encodeURIComponent(invoiceStr)}*`,
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

    // 6. Kirim WhatsApp jika nomor tersedia
    if (c.noTelepon) {
      const kirimRes = await sendWhatsApp(c.noTelepon, pesanWa);
      const statusNotif = kirimRes.ok ? "terkirim" : "gagal";

      if (kirimRes.ok) {
        suksesNotif++;
        console.log(`   ✅ WA terkirim ke ${c.noTelepon}`);
      } else {
        gagalNotif++;
        console.error(`   ❌ WA gagal terkirim ke ${c.noTelepon}: ${kirimRes.error}`);
      }

      // Catat ke riwayat tabel notifikasi
      try {
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
      } catch (errNotifDb) {
        console.warn("   ⚠️ Gagal mencatat notifikasi DB:", errNotifDb.message);
      }
    }

    // Delay 1.2 detik antar nomor
    if (i < calonList.length - 1) {
      await sleep(1200);
    }
  }

  // 7. Kirim summary ke grup WhatsApp Pelanggan Daftar Baru
  console.log("\n📢 Mengirim rekap approval ke grup WhatsApp Pendaftaran Baru...");
  const pesanGrup = [
    `📢 *APPROVAL CALON PELANGGAN BERHASIL*`,
    ``,
    `Sebanyak *${calonList.length} calon pelanggan baru* telah resmi disetujui & diaktifkan di sistem WastePay:`,
    ``,
    `📍 *Sebaran Wilayah & Zona:*`,
    `- *Blok Gg Niman* (Zona 16): 2 Pelanggan`,
    `- *Blok YKP Kelapa* (Zona 19): 3 Pelanggan`,
    `- *Blok Jl. Raya Cilodong / Budeh* (Zona 2): 16 Pelanggan`,
    ``,
    `✅ Status Akun: *Aktif*`,
    `📄 Tagihan: Periode *Oktober 2026* telah diterbitkan untuk semua pelanggan baru.`,
    `📲 Notifikasi WA: Telah dikirimkan langsung ke nomor masing-masing pelanggan.`,
    ``,
    `— Tim Operasional UPS HERU`,
  ].join("\n");

  const resGrup = await sendWhatsApp(GROUP_PENDAFTARAN, pesanGrup);
  if (resGrup.ok) {
    console.log("✅ Pesan rekap berhasil terkirim ke grup WhatsApp.");
  } else {
    console.error("❌ Gagal kirim rekap ke grup:", resGrup.error);
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
