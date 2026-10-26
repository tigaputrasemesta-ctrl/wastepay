/**
 * Modul WhatsApp — kirim tagihan & notifikasi otomatis (pola billing ISP: skylite.id/Skymedia).
 *
 * - Satu pintu kirim: `kirimNotifikasi()` → kirim WA via provider API + simpan record Notifikasi.
 * - Template terstruktur per tipe dengan payment link ke /bayar-tagihan?invoice=... (skylite pattern).
 * - Anti-spam: delay antar pesan saat blast (`WA_BLAST_DELAY_MS`, default 1200ms).
 * - Fallback: jika WA_API_KEY kosong → record `pending` + link wa.me untuk kirim manual.
 *
 * Env:
 *   WA_API_KEY / WA_API_URL        — provider (Fonnte-style). Kosong → mode manual (wa.me).
 *   NEXT_PUBLIC_APP_URL / APP_URL  — base URL untuk payment link absolut di pesan WA.
 *   WA_BLAST_DELAY_MS              — delay antar pesan (ms).
 */
import { prisma } from "./prisma";
import {
  formatRupiahSkylite,
  formatTanggalIndo,
  formatTanggalWaktuIndo,
  BULAN_INDO,
  hitungRincian,
  companyInfo,
} from "./invoice";

export function getWaApiKey(): string {
  const envKey = process.env.WA_API_KEY?.trim();
  if (envKey && envKey !== "pH2Rdsc64x7Mqys9dGHT") {
    return envKey;
  }
  return "yZeWGJymbrnTpub2x5rL";
}

const WA_API_URL = process.env.WA_API_URL?.trim() || "https://api.fonnte.com/send";

/** Nama perusahaan untuk tanda tangan pesan WA (dari env COMPANY_NAME). */
export const NAMA = () => companyInfo().nama;

/** Nomor WhatsApp owner untuk notifikasi & laporan utama */
export function ownerPhone(): string {
  return process.env.OWNER_PHONE?.trim() || "081532843224";
}

/** Nomor WhatsApp admin/superadmin untuk notifikasi internal (format 08xx atau 628xx). */
export function adminPhone(): string {
  return process.env.ADMIN_PHONE?.trim() || "085716251003";
}

/** Bersihkan target: jika WhatsApp Group (@g.us), pertahankan; jika no HP, bersihkan digit */
function cleanTarget(target: string): string {
  const trimmed = target.trim();
  if (trimmed.includes("@g.us")) {
    return trimmed;
  }
  return trimmed.replace(/[^\d]/g, "").replace(/^62/, "0");
}

/**
 * Mendapatkan daftar nomor WhatsApp internal (Owner & Superadmin) untuk penerima report.
 */
export function getInternalReportPhones(): string[] {
  const sources = [
    process.env.REPORT_PHONES?.trim(),
    process.env.OWNER_PHONE?.trim(),
    process.env.ADMIN_PHONE?.trim(),
    // Default: Nomor Owner & Superadmin selalu terdaftar
    "081532843224",
    "085716251003",
  ].filter(Boolean) as string[];

  const cleaned = new Set<string>();
  for (const src of sources) {
    const parts = src.split(/[,;\s]+/);
    for (const part of parts) {
      const target = cleanTarget(part);
      if (target.length >= 9) {
        cleaned.add(target);
      }
    }
  }
  return Array.from(cleaned);
}

/**
 * Target penerima Laporan Pembayaran:
 * - Grup WhatsApp: "Laporan Iuran via Transfer" (120363275305497489@g.us)
 * - Japri: Owner (081532843224) & Superadmin (085716251003)
 */
export function getPembayaranReportTargets(): string[] {
  const sources = [
    process.env.WA_GROUP_PEMBAYARAN_ID?.trim() || "120363275305497489@g.us",
    ...getInternalReportPhones(),
  ].filter(Boolean) as string[];

  const cleaned = new Set<string>();
  for (const src of sources) {
    const parts = src.split(/[,;\s]+/);
    for (const part of parts) {
      const target = cleanTarget(part);
      if (target.length >= 9) {
        cleaned.add(target);
      }
    }
  }
  return Array.from(cleaned);
}

/**
 * Target penerima Laporan Pendaftaran Baru:
 * - Grup WhatsApp: "Hala Kita Sude" (6281532843224-1614736180@g.us)
 * - Japri: Owner (081532843224) & Superadmin (085716251003)
 */
export function getPendaftaranReportTargets(): string[] {
  const sources = [
    process.env.WA_GROUP_PENDAFTARAN_ID?.trim() || "6281532843224-1614736180@g.us",
    ...getInternalReportPhones(),
  ].filter(Boolean) as string[];

  const cleaned = new Set<string>();
  for (const src of sources) {
    const parts = src.split(/[,;\s]+/);
    for (const part of parts) {
      const target = cleanTarget(part);
      if (target.length >= 9) {
        cleaned.add(target);
      }
    }
  }
  return Array.from(cleaned);
}

/**
 * Target penerima Laporan Pengaduan Masuk:
 * - Grup WhatsApp: "Hala Kita Sude" (6281532843224-1614736180@g.us)
 * - Japri: Owner (081532843224), Superadmin (085716251003), Petugas (0895385058054)
 */
export function getPengaduanReportPhones(): string[] {
  const sources = [
    process.env.WA_GROUP_PENGADUAN_ID?.trim() || "6281532843224-1614736180@g.us",
    process.env.REPORT_PENGADUAN_PHONES?.trim(),
    process.env.PETUGAS_PENGADUAN_PHONE?.trim(),
    ...getInternalReportPhones(),
    "0895385058054",
  ].filter(Boolean) as string[];

  const cleaned = new Set<string>();
  for (const src of sources) {
    const parts = src.split(/[,;\s]+/);
    for (const part of parts) {
      const target = cleanTarget(part);
      if (target.length >= 9) {
        cleaned.add(target);
      }
    }
  }
  return Array.from(cleaned);
}

export function isWaEnabled(): boolean {
  return Boolean(getWaApiKey() && WA_API_URL);
}

/** Delay antar pesan saat blast (ms). Default 1200ms — hindari flag spam gateway. */
export function blastDelayMs(): number {
  const v = Number(process.env.WA_BLAST_DELAY_MS);
  return Number.isFinite(v) && v >= 0 ? v : 1200;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Base URL aplikasi untuk link pembayaran di pesan WA. */
export function appBaseUrl(): string {
  return "https://upsheru.com";
}

/** Link halaman tagihan publik untuk satu invoice (absolut jika APP_URL diisi). */
export function paymentLink(noInvoice: string): string {
  const q = `?invoice=${encodeURIComponent(noInvoice)}`;
  const base = appBaseUrl();
  return base ? `${base}/bayar-tagihan${q}` : `/bayar-tagihan${q}`;
}

/** Kirim WA via provider API. Mengembalikan { ok, error? }. */
export async function kirimWhatsApp(
  noTelepon: string,
  pesan: string
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = getWaApiKey();
  if (!apiKey || !WA_API_URL) {
    return { ok: false, error: "WA_API_KEY belum dikonfigurasi" };
  }
  try {
    const res = await fetch(WA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify({
        // Format umum provider (Fonnte/WhatsApp Business API)
        target: noTelepon,
        message: pesan,
        countryCode: "62",
      }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok && data && data.status !== false) return { ok: true };
    return { ok: false, error: data?.reason || data?.message || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

/** Link wa.me untuk kirim manual (fallback). */
function waMeLink(noTelepon: string, pesan: string): string {
  return `https://wa.me/${noTelepon.replace(/^0/, "62")}?text=${encodeURIComponent(pesan)}`;
}

/** Periode Indonesia: "Agustus 2026" */
export function periodeIndo(bulan: number, tahun: number): string {
  return `${BULAN_INDO[bulan - 1]} ${tahun}`;
}

/**
 * Info tagihan yang dipakai template pesan (total sudah termasuk PPN + denda).
 */
export type TagihanWa = {
  noInvoice: string;
  nama: string;
  periode: string;
  total: number;
  denda: number;
  jatuhTempo: Date | string;
  link: string;
  kodePelanggan?: string;
  paket?: string;
};


let templateCache: Record<string, string> | null = null;
let lastFetch = 0;
export async function getCachedTemplates() {
  if (templateCache && Date.now() - lastFetch < 60000) return templateCache;
  const recs = await prisma.pengaturan.findMany({ where: { key: { startsWith: 'WA_TEMPLATE_' } } });
  const map: Record<string, string> = {};
  for (const r of recs) map[r.key] = r.value;
  templateCache = map;
  lastFetch = Date.now();
  return map;
}

export function replaceTpl(tpl: string, data: Record<string, any>) {
  return tpl.replace(/\[(.*?)\]/g, (match, p1) => {
    return data[p1] !== undefined ? String(data[p1]) : match;
  });
}

export function buildTagihanWa(tagihan: {
  noInvoice: string | null;
  bulan: number;
  tahun: number;
  jumlah: number;
  denda: number | null;
  jatuhTempo: Date | string;
  kodePelanggan?: string | null;
  paket?: string | null;
}, nama: string): TagihanWa {
  const { total } = hitungRincian(tagihan.jumlah, tagihan.denda);
  return {
    noInvoice: tagihan.noInvoice || "-",
    nama,
    periode: periodeIndo(tagihan.bulan, tagihan.tahun),
    total,
    denda: 0,
    jatuhTempo: tagihan.jatuhTempo,
    link: paymentLink(tagihan.noInvoice || ""),
    kodePelanggan: tagihan.kodePelanggan || undefined,
    paket: tagihan.paket || undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Template pesan (skylite-style: bold judul + emoji + payment link)   */
/* ------------------------------------------------------------------ */

export async function templateTagihanBaru(t: TagihanWa): Promise<{ judul: string; pesan: string }> {
  const tagline = process.env.COMPANY_TAGLINE?.trim();
  const baris = [
    `Yth. Bapak/Ibu ${t.nama},`,
    ``,
    `Sistem kami telah menerbitkan invoice untuk tagihan Anda, berikut kami sampaikan rincian tagihan Anda:`,
    ``,
    `ID Pelanggan: ${t.kodePelanggan || "-"}`,
    t.paket ? `Paket: ${t.paket}` : null,
    `Periode: ${t.periode}`,
    `Total Tagihan: ${formatRupiahSkylite(t.total)}`,
    `Jatuh Tempo: ${formatTanggalIndo(t.jatuhTempo)}`,
    ``,
    `Anda dapat melakukan pembayaran dan juga melihat detail invoice pdf melalui link berikut:`,
    t.link,
    ``,
    `📢 Ada kendala layanan atau pengaduan sampah? Laporkan langsung di:`,
    `👉 https://upsheru.com/pengaduan`,
    ``,
    `Demikian informasi ini kami sampaikan. Terima kasih`,
    `__`,
    `Best Regards,`,
    ``,
    NAMA(),
    tagline || null,
    `🌐 www.upsheru.com`,
].filter((x): x is string => Boolean(x));
  return { judul: `Tagihan ${t.periode} — ${NAMA()}`, pesan: baris.join("\n") };
}

export async function templateReminder(t: TagihanWa, sisaHari: number): Promise<{ judul: string; pesan: string }> {
  const label =
    sisaHari <= 1
      ? "BESOK adalah batas akhir pembayaran"
      : `${sisaHari} HARI LAGI jatuh tempo`;
  return {
    judul: `Pengingat Tagihan ${t.periode} — ${NAMA()}`,
    pesan: [
      `*PENGINGAT TAGIHAN — ${NAMA().toUpperCase()}*`,
      ``,
      `Halo ${t.nama},`,
      `${label} tagihan iuran sampah ${t.periode}:`,
      ``,
      `📄 No. Tagihan : ${t.noInvoice}`,
      `💰 Total       : ${formatRupiahSkylite(t.total)}`,
      `📅 Jatuh Tempo : ${formatTanggalIndo(t.jatuhTempo)}`,
      ``,
      `💳 Bayar online : ${t.link}`,
      `📢 Pengaduan web: https://upsheru.com/pengaduan`,
      `Terima kasih 🙏`,
      ``,
      `— ${NAMA()}`,
      `🌐 www.upsheru.com`,
].join("\n"),
  };
}

export async function templateTunggakan(t: TagihanWa): Promise<{ judul: string; pesan: string }> {
  return {
    judul: `Tagihan ${t.periode} Menunggak — ${NAMA()}`,
    pesan: [
      `*TAGIHAN MENUNGAK — ${NAMA().toUpperCase()}*`,
      ``,
      `Halo ${t.nama},`,
      `Tagihan iuran sampah ${t.periode} Anda telah melewati jatuh tempo dan dikenakan denda ${formatRupiahSkylite(t.denda)}.`,
      ``,
      `📄 No. Tagihan : ${t.noInvoice}`,
      `💰 Total       : ${formatRupiahSkylite(t.total)}`,
      ``,
      `💳 Segera bayar : ${t.link}`,
      `Agar layanan pengangkutan sampah tetap berjalan tanpa kendala.`,
      `📢 Pusat bantuan & pengaduan: https://upsheru.com/pengaduan`,
      ``,
      `— ${NAMA()}`,
      `🌐 www.upsheru.com`,
].join("\n"),
  };
}

export async function templatePembayaranDiterima(t: TagihanWa, metode: string): Promise<{ judul: string; pesan: string }> {
  return {
    judul: `Pembayaran Diterima — ${NAMA()}`,
    pesan: [
      `*PEMBAYARAN DITERIMA ✅*`,
      ``,
      `Halo ${t.nama},`,
      `Pembayaran tagihan iuran sampah ${t.periode} sebesar ${formatRupiahSkylite(t.total)} telah kami terima via ${metode}.`,
      ``,
      `📄 No. Tagihan : ${t.noInvoice}`,
      `📄 Lihat bukti : ${t.link}`,
      ``,
      `📢 Pusat pengaduan sampah: https://upsheru.com/pengaduan`,
      `Terima kasih! 🙏`,
      ``,
      `— ${NAMA()}`,
      `🌐 www.upsheru.com`,
].join("\n"),
  };
}

export async function templatePembayaranGagal(t: TagihanWa): Promise<{ judul: string; pesan: string }> {
  return {
    judul: `Transaksi Belum Selesai — ${NAMA()}`,
    pesan: [
      `*TRANSAKSI BELUM SELESAI ⏳*`,
      ``,
      `Halo ${t.nama},`,
      `Transaksi pembayaran tagihan ${t.periode} (${t.noInvoice}) sebesar ${formatRupiahSkylite(t.total)} gagal atau kadaluarsa.`,
      ``,
      `Silakan ulangi pembayaran: ${t.link}`,
      ``,
      `— ${NAMA()}`,
      `🌐 www.upsheru.com`,
].join("\n"),
  };
}

export type LaporanPembayaranOwner = {
  noInvoice: string;
  namaPelanggan: string;
  kodePelanggan?: string | null;
  nominal: number;
  metode: string;
  waktu?: Date | string;
  keterangan?: string | null;
};

export async function templateLaporanPembayaranOwner(
  p: LaporanPembayaranOwner
): Promise<{ judul: string; pesan: string }> {
  const waktuStr = p.waktu ? formatTanggalIndo(p.waktu) : formatTanggalIndo(new Date());
  const baris = [
    `💰 *LAPORAN PEMBAYARAN MASUK — ${NAMA().toUpperCase()}*`,
    ``,
    `Halo Pengelola / Owner,`,
    `Pembayaran tagihan pelanggan telah berhasil diterima & tercatat di sistem:`,
    ``,
    `📄 *No. Invoice*   : ${p.noInvoice}`,
    `👤 *Pelanggan*     : ${p.namaPelanggan}${p.kodePelanggan ? ` (${p.kodePelanggan})` : ""}`,
    `💵 *Total Diterima* : *${formatRupiahSkylite(p.nominal)}*`,
    `💳 *Metode*        : ${p.metode}`,
    `📅 *Waktu*         : ${waktuStr}`,
  ];
  if (p.keterangan) {
    baris.push(`📝 *Catatan*       : ${p.keterangan}`);
  }
  baris.push(
    ``,
    `📊 *Pantau Dashboard*:`,
    `👉 ${appBaseUrl()}/pembayaran`,
    ``,
    `— Sistem Notifikasi ${NAMA()}`
  );
  return {
    judul: `Laporan Pembayaran: ${p.noInvoice} - ${p.namaPelanggan}`,
    pesan: baris.join("\n"),
  };
}

export async function templateBuktiBayarBaruOwner(p: {
  noInvoice: string;
  namaPelanggan: string;
  kodePelanggan?: string | null;
  nominal: number;
  metode: string;
}): Promise<{ judul: string; pesan: string }> {
  const baris = [
    `🔔 *BUKTI PEMBAYARAN BARU — ${NAMA().toUpperCase()}*`,
    ``,
    `Pelanggan telah mengunggah bukti transfer baru dan menunggu verifikasi admin:`,
    ``,
    `📄 *No. Invoice*   : ${p.noInvoice}`,
    `👤 *Pelanggan*     : ${p.namaPelanggan}${p.kodePelanggan ? ` (${p.kodePelanggan})` : ""}`,
    `💵 *Nominal*       : *${formatRupiahSkylite(p.nominal)}*`,
    `💳 *Metode*        : ${p.metode}`,
    ``,
    `Silakan verifikasi pembayaran ini di dashboard:`,
    `👉 ${appBaseUrl()}/pembayaran`,
    ``,
    `— Sistem Notifikasi ${NAMA()}`,
  ];
  return {
    judul: `Bukti Bayar Baru Menunggu Verifikasi: ${p.noInvoice}`,
    pesan: baris.join("\n"),
  };
}

export async function templatePendaftaranDiterima(nama: string, kode: string): Promise<{ judul: string; pesan: string }> {
  return {
    judul: `Pendaftaran Diterima — ${NAMA()}`,
    pesan: [
      `*PENDAFTARAN DITERIMA ✅*`,
      ``,
      `Halo ${nama},`,
      `Terima kasih, data pendaftaran Anda sudah kami terima dan sedang menunggu konfirmasi pengelola.`,
      ``,
      `🆔 Kode Pelanggan: ${kode}`,
      ``,
      `💡 *Informasi Layanan Web ${NAMA()}*:`,
      `Melalui website kami (www.upsheru.com), nantinya Anda dapat:`,
      `- Mengecek tagihan dan riwayat pembayaran`,
      `- Melakukan pembayaran secara online (Otomatis terverifikasi)`,
      `- Melihat jadwal penjemputan sampah`,
      `- Menyampaikan laporan / pengaduan sampah: https://upsheru.com/pengaduan`,
      ``,
      `Mohon ditunggu, Anda akan dihubungi jika pendaftaran disetujui.`,
      ``,
      `— ${NAMA()}`,
      `🌐 www.upsheru.com`,
].join("\n"),
  };
}

export async function templatePendaftaranPelangganOlehPetugas(p: PendaftaranAdmin): Promise<{ judul: string; pesan: string }> {
  const baris = [
    "📩 *PENDAFTARAN PELANGGAN BARU*",
    "",
    `👤 *Nama*: ${p.nama}`,
    `🆔 *Kode*: _${p.kodePelanggan}_`,
    `📱 *WhatsApp*: _${p.noTelepon}_`,
    `📍 *Alamat*: ${p.alamat}`,
  ];
  if (p.nominalTagihan) {
    baris.push(`💰 *Nominal Tagihan*: _${formatRupiahSkylite(p.nominalTagihan)}_`);
  }
  if (p.kategori) baris.push(`🗂 *Kategori*: ${p.kategori}`);
  
  baris.push(
    "",
    `💡 *Informasi Layanan Web ${NAMA()}*:`,
    `Melalui website kami (www.upsheru.com), nantinya Anda dapat:`,
    `- Mengecek tagihan dan riwayat pembayaran`,
    `- Melakukan pembayaran secara online (Otomatis terverifikasi)`,
    `- Melihat jadwal penjemputan sampah`,
    `- Menyampaikan keluhan atau komplain terkait layanan`,
    ``,
    `Mohon ditunggu, Anda akan dihubungi jika pendaftaran disetujui.`,
    ``,
    `— *${NAMA()}*`,
    `🌐 _www.upsheru.com_`
  );

  return { judul: `Pendaftaran Diterima — ${NAMA()}`, pesan: baris.join("\n") };
}

/* ------------------------------------------------------------------ */
/* Template: pendaftaran baru → admin/helpdesk (pola skylite:          */
/* data registrasi diteruskan ke helpdesk via WA)                      */
/* ------------------------------------------------------------------ */

export type PendaftaranAdmin = {
  nama: string;
  kodePelanggan: string;
  noTelepon: string;
  alamat: string;
  kategori?: string | null;
  paket?: string | null;
  nominalTagihan?: number | null;
  patokanLokasi?: string | null;
  referal?: string | null;
  tanggalPenagihanCustom?: string | null;
  jadwalHari?: string | null;
};

export async function templatePendaftaranAdmin(p: PendaftaranAdmin): Promise<{ judul: string; pesan: string }> {
  const baris = [
    "📩 *PENDAFTARAN PELANGGAN BARU*",
    "",
    `👤 Nama: ${p.nama}`,
    `🆔 Kode: ${p.kodePelanggan}`,
    `📱 WhatsApp: ${p.noTelepon}`,
    `📍 Alamat: ${p.alamat}`,
  ];
  if (p.nominalTagihan) {
    baris.push(`💰 Nominal Tagihan: ${formatRupiahSkylite(p.nominalTagihan)}`);
  }
  if (p.kategori) baris.push(`🗂 Kategori: ${p.kategori}`);
  if (p.tanggalPenagihanCustom) baris.push(`🗓 Req Tgl Penagihan: ${p.tanggalPenagihanCustom}`);
  if (p.jadwalHari) baris.push(`🗓 Req Hari Jemput: ${p.jadwalHari}`);
  if (p.patokanLokasi) baris.push(`🧭 Patokan: ${p.patokanLokasi}`);
  if (p.referal) baris.push(`🤝 Referal: ${p.referal}`);
  baris.push(
    "",
    `📋 Kelola & Konfirmasi di Dashboard:`,
    `👉 ${appBaseUrl()}/pelanggan`,
    "",
    `Segera konfirmasi di aplikasi ${NAMA()}.`,
    `— ${NAMA()}`
  );
  return { judul: `Pendaftaran Baru: ${p.nama}`, pesan: baris.join("\n") };
}

export type LaporanPengaduan = {
  idKomplain?: number;
  namaPelanggan: string;
  kodePelanggan: string;
  noTelepon: string;
  alamat: string;
  patokanLokasi?: string | null;
  googleMapsUrl?: string | null;
  zonaAngkut?: string | null;
  statusTagihan?: string | null;
  jenisPengaduan?: string | null;
  deskripsi: string;
  waktu: Date | string;
};

export async function templatePengaduanAdmin(
  p: LaporanPengaduan
): Promise<{ judul: string; pesan: string }> {
  const waktuStr = formatTanggalWaktuIndo(p.waktu) + " WIB";

  const baris = [
    `📢 *PENGADUAN BARU — ${NAMA().toUpperCase()}*`,
    ``,
    `👤 *Nama*: ${p.namaPelanggan}`,
    `🆔 *Kode*: ${p.kodePelanggan}`,
    `📱 *WhatsApp*: ${p.noTelepon}`,
    `📍 *Alamat*: ${p.alamat}`,
  ];

  if (p.patokanLokasi) {
    baris.push(`🧭 *Patokan*: ${p.patokanLokasi}`);
  }
  if (p.zonaAngkut) {
    baris.push(`🚛 *Zona Angkut*: ${p.zonaAngkut}`);
  }
  if (p.googleMapsUrl) {
    baris.push(`🗺️ *Titik Maps*: ${p.googleMapsUrl}`);
  }
  if (p.statusTagihan) {
    baris.push(`💳 *Status Tagihan*: ${p.statusTagihan}`);
  }
  if (p.jenisPengaduan) {
    baris.push(`⚠️ *Jenis*: ${p.jenisPengaduan}`);
  }

  baris.push(
    `🗓️ *Waktu Lapor*: ${waktuStr}`,
    ``,
    `📝 *Isi Keluhan*:`,
    `"${p.deskripsi}"`,
    ``,
    `📋 *Tindak Lanjuti di Dashboard*:`,
    `👉 ${appBaseUrl()}/pengaduan`,
    ``,
    `— Sistem Operasional ${NAMA()}`
  );

  return {
    judul: `Pengaduan: ${p.namaPelanggan} (${p.kodePelanggan})`,
    pesan: baris.join("\n"),
  };
}

/* ------------------------------------------------------------------ */
/* Kirim + record                                                      */
/* ------------------------------------------------------------------ */

export type KirimNotifParams = {
  tipe: string;
  judul: string;
  pesan: string;
  pelangganId?: number | null;
  noTelepon?: string | null;
  createdById?: number | null;
  /** Override auto-send (default: isWaEnabled()). */
  autoSend?: boolean;
};

export type KirimNotifResult = {
  status: "terkirim" | "pending" | "gagal";
  error?: string;
  /** Link wa.me saat mode manual (fallback). */
  link?: string;
};

/**
 * Kirim satu notifikasi WA + simpan record.
 * - autoSend on  → kirim via provider, status terkirim/gagal.
 * - autoSend off → status pending + link wa.me (kirim manual).
 */
export async function kirimNotifikasi(
  params: KirimNotifParams
): Promise<KirimNotifResult> {
  const autoSend = params.autoSend ?? isWaEnabled();
  let status: KirimNotifResult["status"] = "pending";
  let error: string | undefined;
  let dikirimPada: Date | null = null;
  let link: string | undefined;

  if (params.noTelepon) {
    if (autoSend) {
      try {
        const hasil = await kirimWhatsApp(params.noTelepon, params.pesan);
        if (hasil.ok) {
          status = "terkirim";
          dikirimPada = new Date();
        } else {
          status = "gagal";
          error = hasil.error;
        }
      } catch (e) {
        status = "gagal";
        error = e instanceof Error ? e.message : "Error kirim WA";
      }
    } else {
      link = waMeLink(params.noTelepon, params.pesan);
    }
  } else {
    status = "gagal";
    error = "No telepon pelanggan tidak tersedia";
  }

  await prisma.notifikasi.create({
    data: {
      tipe: params.tipe,
      judul: params.judul,
      pesan: params.pesan,
      penerima: params.noTelepon || "-",
      status,
      error,
      dikirimPada,
      pelangganId: params.pelangganId ?? null,
      createdById: params.createdById ?? null,
    },
  });

  return { status, error, link };
}

/**
 * Kirim notifikasi / report pembayaran ke Grup WA "Laporan Iuran via Transfer", Owner, dan Superadmin.
 */
export async function kirimReportPembayaran(params: {
  tipe: string;
  judul: string;
  pesan: string;
  pelangganId?: number | null;
  createdById?: number | null;
}): Promise<void> {
  const targets = getPembayaranReportTargets();
  for (const target of targets) {
    try {
      await kirimNotifikasi({
        tipe: params.tipe,
        judul: params.judul,
        pesan: params.pesan,
        noTelepon: target,
        pelangganId: params.pelangganId ?? null,
        createdById: params.createdById ?? null,
      });
    } catch (err) {
      console.error(`[WA Report Pembayaran] Gagal kirim ke ${target}:`, err);
    }
  }
}

/**
 * Kirim notifikasi / report pendaftaran ke Grup WA "Hala Kita Sude", Owner, dan Superadmin.
 */
export async function kirimReportPendaftaran(params: {
  tipe: string;
  judul: string;
  pesan: string;
  pelangganId?: number | null;
  createdById?: number | null;
}): Promise<void> {
  const targets = getPendaftaranReportTargets();
  for (const target of targets) {
    try {
      await kirimNotifikasi({
        tipe: params.tipe,
        judul: params.judul,
        pesan: params.pesan,
        noTelepon: target,
        pelangganId: params.pelangganId ?? null,
        createdById: params.createdById ?? null,
      });
    } catch (err) {
      console.error(`[WA Report Pendaftaran] Gagal kirim ke ${target}:`, err);
    }
  }
}

/**
 * Kirim notifikasi / report ke Owner & Admin internal (serta grup pembayaran terkait).
 */
export async function kirimReportOwner(params: {
  tipe: string;
  judul: string;
  pesan: string;
  pelangganId?: number | null;
  createdById?: number | null;
}): Promise<void> {
  return kirimReportPembayaran(params);
}

/**
 * Kirim notifikasi / report pengaduan ke Owner, Superadmin, dan Petugas Lapangan Pengaduan.
 */
export async function kirimReportPengaduan(params: {
  tipe: string;
  judul: string;
  pesan: string;
  pelangganId?: number | null;
  createdById?: number | null;
}): Promise<void> {
  const targets = getPengaduanReportPhones();
  for (const noHp of targets) {
    try {
      await kirimNotifikasi({
        tipe: params.tipe,
        judul: params.judul,
        pesan: params.pesan,
        noTelepon: noHp,
        pelangganId: params.pelangganId ?? null,
        createdById: params.createdById ?? null,
      });
    } catch (err) {
      console.error(`[WA Report Pengaduan] Gagal kirim ke ${noHp}:`, err);
    }
  }
}

export type TargetWa = {
  pelangganId: number;
  nama: string;
  noTelepon: string | null;
};

export type BlastWaResult = {
  terkirim: number;
  pending: number;
  gagal: number;
  failures: string[];
  links: string[];
};

/**
 * Kirim pesan ke banyak pelanggan dengan delay antar pesan (anti-spam).
 * `buatPesan(t)` mengembalikan { judul, pesan } per target.
 */
export async function kirimBlastWa(
  targets: TargetWa[],
  tipe: string,
  buatPesan: (t: TargetWa) => Promise<{ judul: string; pesan: string }>,
  opts?: { createdById?: number | null; autoSend?: boolean }
): Promise<BlastWaResult> {
  const hasil: BlastWaResult = { terkirim: 0, pending: 0, gagal: 0, failures: [], links: [] };
  const delay = blastDelayMs();

  for (const t of targets) {
    const { judul, pesan } = await buatPesan(t);
    const r = await kirimNotifikasi({
      tipe,
      judul,
      pesan,
      pelangganId: t.pelangganId,
      noTelepon: t.noTelepon,
      createdById: opts?.createdById ?? null,
      autoSend: opts?.autoSend,
    });
    if (r.status === "terkirim") hasil.terkirim++;
    else if (r.status === "pending") {
      hasil.pending++;
      if (r.link) hasil.links.push(r.link);
    } else {
      hasil.gagal++;
      hasil.failures.push(`${t.nama}: ${r.error || "gagal"}`);
    }
    if (delay > 0) await sleep(delay);
  }

  return hasil;
}

/**
 * Cek apakah notifikasi dengan tipe + kata kunci tertentu sudah pernah dikirim
 * untuk pelanggan yang sama (dedup idempoten, mis. webhook Duitku dobel).
 */
export async function sudahKirimWa(
  tipe: string,
  pelangganId: number,
  kataKunci: string,
  maxAgeDays = 60
): Promise<boolean> {
  const sejak = new Date(Date.now() - maxAgeDays * 24 * 3600 * 1000);
  const ada = await prisma.notifikasi.findFirst({
    where: {
      tipe,
      pelangganId,
      createdAt: { gte: sejak },
      // Nomor invoice berada di isi pesan, bukan judul
      pesan: { contains: kataKunci },
    },
    select: { id: true },
  });
  return Boolean(ada);
}

export async function templatePendaftaranDisetujui(nama: string, kode: string): Promise<{ judul: string; pesan: string }> {
  return {
    judul: `Pendaftaran Disetujui — ${NAMA()}`,
    pesan: [
      `*PENDAFTARAN DISETUJUI ✅*`,
      ``,
      `Halo ${nama},`,
      `Selamat! Pendaftaran berlangganan Anda telah disetujui.`,
      ``,
      `🆔 Kode Pelanggan: ${kode}`,
      ``,
      `💡 *Informasi Layanan Web ${NAMA()}*:`,
      `Melalui website kami (www.upsheru.com), Anda dapat:`,
      `- Mengecek tagihan dan riwayat pembayaran`,
      `- Melakukan pembayaran secara online (Otomatis terverifikasi)`,
      `- Melihat jadwal penjemputan sampah`,
      `- Menyampaikan laporan / pengaduan sampah: https://upsheru.com/pengaduan`,
      ``,
      `Anda dapat menggunakan nomor WhatsApp Anda atau kode pelanggan untuk masuk ke sistem kami.`,
      `Terima kasih telah bergabung.`,
      ``,
      `— ${NAMA()}`,
      `🌐 www.upsheru.com`,
].join("\n"),
  };
}
