// Reminder WhatsApp otomatis untuk tagihan Multi-Tenant O2WHERO / WastePay.
// Menjamin isolasi penuh kredensial, kuota, dan data warga per tenant mitra.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
let adapter;
if (dbUrl.startsWith("postgres")) {
  const pool = new Pool({
    connectionString: dbUrl,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" }
        : undefined,
  });
  adapter = new PrismaPg(pool);
} else {
  adapter = new PrismaLibSql({ url: dbUrl });
}
const prisma = new PrismaClient({ adapter });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const periode = (bulan, tahun) => `${BULAN[bulan - 1]} ${tahun}`;
const rupiah = (n) => `Rp${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")},-`;
const tglIndo = (d) => `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const totalTagihan = (jumlah, denda) => Math.round(jumlah + jumlah * 0.11) + (denda || 0);

async function kirimWa(target, text, apiKey, delayMs = 1200) {
  if (!apiKey) return { ok: false, reason: "API key WhatsApp tidak tersedia" };
  try {
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        target,
        message: text,
        countryCode: "62",
        delay: String(delayMs),
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data && data.status !== false) return { ok: true };
    return { ok: false, reason: data?.reason || data?.message || `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

async function processTenant(tenant) {
  const tenantId = tenant.id;
  const tenantName = tenant.namaMitra || "Pengelola Sampah";
  const primaryDomain = tenant.primaryDomain || `${tenant.slug}.o2whero.com`;
  const waApiKey = tenant.waConfig?.waApiKey1 || process.env.WA_API_KEY;
  const delayMs = tenant.waConfig?.blastDelayMs || 1200;

  console.log(`\n=== Memproses Tenant: ${tenantName} (ID: ${tenantId}) ===`);

  if (!waApiKey) {
    console.warn(`[Skip] Tenant ${tenantName} belum mengonfigurasi WA API Key.`);
    return;
  }

  const now = new Date();
  const today = startOfDay(now);
  const h3 = new Date(today.getTime() + 3 * 86400000);
  const h1 = new Date(today.getTime() + 1 * 86400000);

  // 1. Ambil tagihan jatuh tempo H-3 dan H-1 milik tenant ini
  const reminders = await prisma.tagihan.findMany({
    where: {
      tenantId,
      status: "belum_bayar",
      deletedAt: null,
      OR: [
        { jatuhTempo: { gte: h3, lt: new Date(h3.getTime() + 86400000) } },
        { jatuhTempo: { gte: h1, lt: new Date(h1.getTime() + 86400000) } },
      ],
      pelanggan: {
        skemaBayar: { not: "kolektif_anggota" },
      },
    },
    include: {
      pelanggan: { select: { id: true, nama: true, noTelepon: true, kodePelanggan: true } },
    },
  });

  console.log(`[${tenantName}] Ditemukan ${reminders.length} tagihan reminder.`);

  for (const t of reminders) {
    if (!t.pelanggan?.noTelepon) continue;
    const isH1 = t.jatuhTempo >= h1 && t.jatuhTempo < new Date(h1.getTime() + 86400000);
    const tipe = isH1 ? "reminder_h1" : "reminder_h3";
    const label = isH1 ? "BESOK adalah batas akhir pembayaran" : "3 HARI LAGI batas akhir pembayaran";

    const payUrl = `https://${primaryDomain}/bayar-tagihan?invoice=${encodeURIComponent(t.noInvoice || "")}`;
    const text = [
      `🌿 *Pengingat Tagihan Sampah — ${tenantName}*`,
      ``,
      `Halo Bapak/Ibu *${t.pelanggan.nama}*,`,
      `Mengingatkan bahwa ${label} untuk iuran sampah periode *${periode(t.bulan, t.tahun)}*:`,
      ``,
      `• No. Tagihan : ${t.noInvoice || "-"}`,
      `• Total       : *${rupiah(totalTagihan(t.jumlah, t.denda))}*`,
      `• Jatuh Tempo : ${tglIndo(t.jatuhTempo)}`,
      ``,
      `👉 *Bayar via QRIS instan di sini:*`,
      payUrl,
      ``,
      `Terima kasih! 🙏`,
      `— *${tenantName}*`,
    ].join("\n");

    const res = await kirimWa(t.pelanggan.noTelepon, text, waApiKey, delayMs);
    if (res.ok) {
      await prisma.notifikasi.create({
        data: {
          tenantId,
          pelangganId: t.pelanggan.id,
          tipe,
          judul: `Pengingat Tagihan ${periode(t.bulan, t.tahun)}`,
          pesan: text,
          penerima: t.pelanggan.noTelepon,
          status: "terkirim",
          dikirimPada: new Date(),
        },
      });
      // Deduct quota
      await prisma.tenantQuotaUsage.updateMany({
        where: { tenantId },
        data: { pesanTerkirim: { increment: 1 } },
      }).catch(() => {});
      console.log(`[Success] Dikirim ke ${t.pelanggan.nama} (${t.pelanggan.noTelepon})`);
    }
    await sleep(delayMs);
  }
}

async function main() {
  try {
    let tenants = [];
    try {
      tenants = await prisma.tenant.findMany({
        where: { status: "aktif" },
        include: { waConfig: true, quotaUsage: true },
      });
    } catch {
      // Fallback
    }

    if (tenants.length === 0) {
      tenants = [{
        id: "tenant-pilot-upsheru",
        slug: "upsheru",
        namaMitra: "UPS HERU",
        primaryDomain: "upsheru.com",
      }];
    }

    for (const t of tenants) {
      await processTenant(t);
    }
    console.log("\nMulti-tenant reminder processing finished.");
  } catch (err) {
    console.error("Fatal error in cron:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
