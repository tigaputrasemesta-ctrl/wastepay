// Reminder WhatsApp otomatis untuk tagihan (pola billing ISP: skylite.id/Skymedia).
// Jalankan via cron / Windows Task Scheduler, mis. tiap hari 09:00:
//   node scripts/reminder-wa.mjs
//
// Yang dikerjakan:
//   0. AUTO-GENERATE TAGIHAN: pada tanggal TAGIHAN_GENERATE_DAY (default 1) → buat
//      tagihan bulan berjalan untuk semua pelanggan aktif + kirim WA invoice.
//   1. H-3 & H-1 sebelum jatuh tempo  → reminder (tipe: reminder_h3 / reminder_h1)
//   2. Lewat jatuh tempo               → tandai tunggakan + denda 2%/bulan, kirim pesan tunggakan
// Idempoten: tidak mengirim dobel (dedup per tipe + noInvoice di tabel Notifikasi).
// Anti-spam: delay antar pesan via WA_BLAST_DELAY_MS (default 1200ms).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaLibSql } from "@prisma/adapter-libsql";

// Auto-detect driver: Postgres (produksi/Vercel/Supabase) vs SQLite (dev lokal).
// Jangan hardcode satu adapter — app utama memakai PrismaPg, sedangkan dev.db lokal
// memakai libsql. Skema URL menentukan adapter yang dipakai.
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

const WA_API_KEY = process.env.WA_API_KEY?.trim();
const WA_API_URL = process.env.WA_API_URL?.trim();
const WA_AUTO_SEND = process.env.WA_AUTO_SEND !== "false";
const NAMA = process.env.COMPANY_NAME?.trim() || "O2W Hero Zero Waste";

const DELAY_MS = (() => {
  const v = Number(process.env.WA_BLAST_DELAY_MS);
  return Number.isFinite(v) && v >= 0 ? v : 1200;
})();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Konfigurasi auto-generate tagihan (cron).
const TAGIHAN_GENERATE_ENABLED = process.env.TAGIHAN_GENERATE_ENABLED !== "false";
const TAGIHAN_GENERATE_DAY = (() => {
  const v = Number(process.env.TAGIHAN_GENERATE_DAY);
  return Number.isInteger(v) && v >= 1 && v <= 28 ? v : 1;
})();
// Override bulan/tahun target (default: bulan berjalan). Berguna untuk generate bulan depan lebih awal.
const TAGIHAN_GENERATE_BULAN = (() => {
  const v = Number(process.env.TAGIHAN_GENERATE_BULAN);
  return Number.isInteger(v) && v >= 1 && v <= 12 ? v : new Date().getMonth() + 1;
})();
const TAGIHAN_GENERATE_TAHUN = (() => {
  const v = Number(process.env.TAGIHAN_GENERATE_TAHUN);
  return Number.isInteger(v) && v >= 2020 && v <= 2100 ? v : new Date().getFullYear();
})();

/* ---------------- helper format ---------------- */
const BULAN = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const periode = (bulan, tahun) => `${BULAN[bulan - 1]} ${tahun}`;
const rupiah = (n) => `Rp${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")},-`;
const tglIndo = (d) => `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const totalTagihan = (jumlah, denda) => Math.round(jumlah + jumlah * 0.11) + (denda || 0);

/* ---------------- template (sama dengan src/lib/wa.ts) ---------------- */
function templateReminder(t, sisaHari) {
  const label = sisaHari <= 1 ? "BESOK adalah batas akhir pembayaran" : `${sisaHari} HARI LAGI jatuh tempo`;
  return {
    judul: `Pengingat Tagihan ${t.periode} — ${NAMA}`,
    pesan: [
      `*PENGINGAT TAGIHAN — ${NAMA.toUpperCase()}*`,
      ``,
      `Halo ${t.nama},`,
      `${label} tagihan iuran sampah ${t.periode}:`,
      ``,
      `📄 No. Tagihan : ${t.noInvoice}`,
      `💰 Total       : ${rupiah(t.total)} (termasuk PPN 11%)`,
      `📅 Jatuh Tempo : ${tglIndo(new Date(t.jatuhTempo))}`,
      ``,
      `💳 Bayar online: ${t.link}`,
      `Terima kasih 🙏`,
      ``,
      `— ${NAMA}`,
      `🌐 www.upsheru.com`,
].join("\n"),
  };
}

function templateTunggakan(t) {
  return {
    judul: `Tagihan ${t.periode} Menunggak — ${NAMA}`,
    pesan: [
      `*TAGIHAN MENUNGAK — ${NAMA.toUpperCase()}*`,
      ``,
      `Halo ${t.nama},`,
      `Tagihan iuran sampah ${t.periode} Anda telah melewati jatuh tempo dan dikenakan denda ${rupiah(t.denda)}.`,
      ``,
      `📄 No. Tagihan : ${t.noInvoice}`,
      `💰 Total       : ${rupiah(t.total)} (termasuk PPN 11% + denda)`,
      ``,
      `💳 Segera bayar: ${t.link}`,
      `Agar layanan pengangkutan sampah tetap berjalan tanpa kendala.`,
      ``,
      `— ${NAMA}`,
      `🌐 www.upsheru.com`,
].join("\n"),
  };
}

const appBase = (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "").replace(/\/+$/, "");
const paymentLink = (noInvoice) => {
  const q = `?invoice=${encodeURIComponent(noInvoice)}`;
  return appBase ? `${appBase}/bayar-tagihan${q}` : `/bayar-tagihan${q}`;
};

/* ---------------- template tagihan baru (sama dengan src/lib/wa.ts) ---------------- */
function templateTagihanBaru(t) {
  const tagline = process.env.COMPANY_TAGLINE?.trim();
  const baris = [
    `Yth. Bapak/Ibu ${t.nama},`,
    ``,
    `Sistem kami telah menerbitkan invoice untuk tagihan Anda, berikut kami sampaikan rincian tagihan Anda:`,
    ``,
    `ID Pelanggan: ${t.kodePelanggan || "-"}`,
    t.paket ? `Paket: ${t.paket}` : null,
    `Periode: ${t.periode}`,
    `Total Tagihan: ${rupiah(t.total)}`,
    `Jatuh Tempo: ${tglIndo(new Date(t.jatuhTempo))}`,
    ``,
    `Anda dapat melakukan pembayaran dan juga melihat detail invoice pdf melalui link berikut:`,
    t.link,
    ``,
    `Demikian informasi ini kami sampaikan. Terima kasih`,
    `__`,
    `Best Regards,`,
    ``,
    NAMA,
    tagline || null,
    `🌐 www.upsheru.com`,
].filter(Boolean);
  return { judul: `Tagihan ${t.periode} — ${NAMA}`, pesan: baris.join("\n") };
}

/* ---------------- auto-generate tagihan bulanan ---------------- */
async function generateTagihanBulanan() {
  const bulan = TAGIHAN_GENERATE_BULAN;
  const tahun = TAGIHAN_GENERATE_TAHUN;
  const hasil = { dibuat: 0, sudahAda: 0, error: 0, waTerkirim: 0, waPending: 0, waGagal: 0, errors: [] };

  const pelangganList = await prisma.pelanggan.findMany({
    where: { status: "aktif", deletedAt: null },
    include: { paket: true },
  });

  const noInvoice = (p) =>
    `INV/${p.kodePelanggan.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()}/${tahun}${String(bulan).padStart(2, "0")}`;

  for (const pelanggan of pelangganList) {
    try {
      const existing = await prisma.tagihan.findUnique({
        where: { pelangganId_bulan_tahun: { pelangganId: pelanggan.id, bulan, tahun } },
        select: { id: true },
      });
      if (existing) {
        hasil.sudahAda++;
        continue;
      }

      // Tarif: customTarif > paket.harga > kategoriTarif
      let tarif = pelanggan.customTarif;
      if (!tarif && pelanggan.paket) tarif = pelanggan.paket.harga;
      if (!tarif) {
        const kt = await prisma.kategoriTarif.findUnique({ where: { kategori: pelanggan.kategori } });
        tarif = kt?.tarif ?? 0;
      }

      const inv = noInvoice(pelanggan);
      const jatuhTempo = new Date(tahun, bulan - 1, 15);
      await prisma.tagihan.create({
        data: {
          pelangganId: pelanggan.id,
          bulan,
          tahun,
          jumlah: tarif,
          status: "belum_bayar",
          jatuhTempo,
          keterangan: `Tagihan bulan ${bulan}/${tahun} (auto-generate)`,
          noInvoice: inv,
        },
      });
      hasil.dibuat++;

      // WA invoice ke pelanggan (pola skylite / Fonnte)
      if (pelanggan.noTelepon) {
        const t = {
          noInvoice: inv,
          nama: pelanggan.nama,
          periode: periode(bulan, tahun),
          total: totalTagihan(tarif, 0),
          jatuhTempo,
          link: paymentLink(inv),
          kodePelanggan: pelanggan.kodePelanggan,
          paket: pelanggan.paket?.nama || undefined,
        };
        const { judul, pesan } = templateTagihanBaru(t);
        const status = await kirimWa(pelanggan, "tagihan_baru", judul, pesan);
        if (status === "terkirim") hasil.waTerkirim++;
        else if (status === "pending") hasil.waPending++;
        else {
          hasil.waGagal++;
          hasil.errors.push(`${pelanggan.nama}: WA ${status}`);
        }
        if (DELAY_MS > 0) await sleep(DELAY_MS);
      }
    } catch (e) {
      hasil.error++;
      hasil.errors.push(`Pelanggan #${pelanggan.id} (${pelanggan.nama}): ${e instanceof Error ? e.message : e}`);
    }
  }

  // Audit log (cron → userId null)
  if (hasil.dibuat > 0) {
    await prisma.auditLog.create({
      data: {
        aksi: "create",
        entitas: "Tagihan",
        entitasId: 0,
        dataBaru: JSON.stringify({ bulan, tahun, ...hasil, sumber: "cron" }),
        userId: null,
      },
    });
  }
  return { bulan, tahun, ...hasil };
}

/* ---------------- kirim + record ---------------- */
async function kirimWa(pelanggan, tipe, judul, pesan) {
  let status = "pending";
  let error = null;
  let dikirimPada = null;

  if (pelanggan.noTelepon && WA_API_KEY && WA_API_URL && WA_AUTO_SEND) {
    try {
      const res = await fetch(WA_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: WA_API_KEY },
        body: JSON.stringify({ target: pelanggan.noTelepon, message: pesan, countryCode: "62" }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.status !== false) {
        status = "terkirim";
        dikirimPada = new Date();
      } else {
        status = "gagal";
        error = data?.reason || data?.message || `HTTP ${res.status}`;
      }
    } catch (e) {
      status = "gagal";
      error = e instanceof Error ? e.message : "Network error";
    }
  } else if (!pelanggan.noTelepon) {
    status = "gagal";
    error = "no telepon tidak tersedia";
  }

  await prisma.notifikasi.create({
    data: {
      tipe,
      judul,
      pesan,
      penerima: pelanggan.noTelepon || "-",
      status,
      error,
      dikirimPada,
      pelangganId: pelanggan.id,
    },
  });
  return status;
}

async function sudahAda(tipe, pelangganId, noInvoice, maxAgeDays = 60) {
  const sejak = new Date(Date.now() - maxAgeDays * 86400000);
  return Boolean(
    await prisma.notifikasi.findFirst({
      where: { tipe, pelangganId, createdAt: { gte: sejak }, pesan: { contains: noInvoice } },
      select: { id: true },
    })
  );
}

/* ---------------- main ---------------- */
const now = new Date();
const today = startOfDay(now);
const h1 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
const h3 = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);

const ringkasan = { reminderH3: 0, reminderH1: 0, tunggakan: 0, terkirim: 0, pending: 0, gagal: 0, skip: 0 };
const failures = [];

async function prosesTagihan(tagihan, tipe, sisaHari) {
  const p = tagihan.pelanggan;
  const noInvoice = tagihan.noInvoice || `INV/${p.kodePelanggan}/${tagihan.tahun}${String(tagihan.bulan).padStart(2, "0")}`;

  // Dedup: jangan kirim reminder H-3/H-1 jika invoice baru saja dikirim (tagihan_baru < 5 hari)
  if (tipe !== "tunggakan" && (await sudahAda("tagihan_baru", p.id, noInvoice, 5))) {
    ringkasan.skip++;
    return;
  }
  if (await sudahAda(tipe, p.id, noInvoice)) {
    ringkasan.skip++;
    return;
  }

  const t = {
    noInvoice,
    nama: p.nama,
    periode: periode(tagihan.bulan, tagihan.tahun),
    total: totalTagihan(tagihan.jumlah, tagihan.denda),
    denda: tagihan.denda || 0,
    jatuhTempo: tagihan.jatuhTempo,
    link: paymentLink(noInvoice),
  };
  const { judul, pesan } = tipe === "tunggakan" ? templateTunggakan(t) : templateReminder(t, sisaHari);

  const status = await kirimWa(p, tipe, judul, pesan);
  if (status === "terkirim") ringkasan.terkirim++;
  else if (status === "pending") ringkasan.pending++;
  else {
    ringkasan.gagal++;
    failures.push(`${p.nama} (${p.noTelepon || "-"}): ${status}`);
  }

  if (DELAY_MS > 0) await sleep(DELAY_MS);
}

try {
  // 0) Auto-generate tagihan bulanan (default: tanggal 1)
  let generate = null;
  if (TAGIHAN_GENERATE_ENABLED && today.getDate() === TAGIHAN_GENERATE_DAY) {
    generate = await generateTagihanBulanan();
    ringkasan.generate = generate;
  }

  // 1) Reminder H-3 & H-1 (belum bayar, belum tunggakan)
  const reminders = await prisma.tagihan.findMany({
    where: {
      status: "belum_bayar",
      deletedAt: null,
      OR: [
        { jatuhTempo: { gte: h1, lt: new Date(h1.getTime() + 86400000) } },
        { jatuhTempo: { gte: h3, lt: new Date(h3.getTime() + 86400000) } },
      ],
    },
    include: { pelanggan: { select: { id: true, nama: true, noTelepon: true, kodePelanggan: true } } },
  });

  for (const t of reminders) {
    const isH1 = t.jatuhTempo >= h1 && t.jatuhTempo < new Date(h1.getTime() + 86400000);
    if (isH1) {
      ringkasan.reminderH1++;
      await prosesTagihan(t, "reminder_h1", 1);
    } else {
      ringkasan.reminderH3++;
      await prosesTagihan(t, "reminder_h3", 3);
    }
  }

  // 2) Tunggakan: tandai lewat jatuh tempo + denda 2%/bulan, kirim pesan
  const overdue = await prisma.tagihan.findMany({
    where: { status: "belum_bayar", jatuhTempo: { lt: today }, deletedAt: null },
    select: { id: true, jumlah: true, jatuhTempo: true },
  });
  const MS_PER_BULAN = 30 * 24 * 3600 * 1000;
  const baruTunggakan = [];
  for (const t of overdue) {
    const bulanTerlambat = Math.max(1, Math.floor((now.getTime() - t.jatuhTempo.getTime()) / MS_PER_BULAN));
    const denda = Math.round(t.jumlah * 0.02 * bulanTerlambat);
    await prisma.tagihan.update({ where: { id: t.id }, data: { status: "tunggakan", denda } });
    baruTunggakan.push(t.id);
  }
  if (baruTunggakan.length > 0) {
    const list = await prisma.tagihan.findMany({
      where: { id: { in: baruTunggakan } },
      include: { pelanggan: { select: { id: true, nama: true, noTelepon: true, kodePelanggan: true } } },
    });
    for (const t of list) {
      ringkasan.tunggakan++;
      await prosesTagihan(t, "tunggakan", 0);
    }
  }

  console.log(JSON.stringify({ tanggal: today.toISOString().slice(0, 10), ringkasan, failures }, null, 2));
} catch (e) {
  console.error("Gagal menjalankan reminder:", e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
