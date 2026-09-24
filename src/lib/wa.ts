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
  BULAN_INDO,
  hitungRincian,
  companyInfo,
} from "./invoice";

const WA_API_KEY = process.env.WA_API_KEY?.trim();
const WA_API_URL = process.env.WA_API_URL?.trim();

/** Nama perusahaan untuk tanda tangan pesan WA (dari env COMPANY_NAME). */
export const NAMA = () => companyInfo().nama;

/** Nomor WhatsApp admin/helpdesk untuk notifikasi internal (format 08xx atau 628xx). */
export function adminPhone(): string {
  return process.env.ADMIN_PHONE?.trim() || "";
}

export function isWaEnabled(): boolean {
  return Boolean(WA_API_KEY && WA_API_URL);
}

/** Delay antar pesan saat blast (ms). Default 1200ms — hindari flag spam gateway. */
export function blastDelayMs(): number {
  const v = Number(process.env.WA_BLAST_DELAY_MS);
  return Number.isFinite(v) && v >= 0 ? v : 1200;
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Base URL aplikasi untuk link pembayaran di pesan WA. */
export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    ""
  ).replace(/\/+$/, "");
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
  if (!WA_API_KEY || !WA_API_URL) {
    return { ok: false, error: "WA_API_KEY belum dikonfigurasi" };
  }
  try {
    const res = await fetch(WA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: WA_API_KEY,
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
    denda: tagihan.denda || 0,
    jatuhTempo: tagihan.jatuhTempo,
    link: paymentLink(tagihan.noInvoice || ""),
    kodePelanggan: tagihan.kodePelanggan || undefined,
    paket: tagihan.paket || undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Template pesan (skylite-style: bold judul + emoji + payment link)   */
/* ------------------------------------------------------------------ */

export function templateTagihanBaru(t: TagihanWa): { judul: string; pesan: string } {
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
    `Demikian informasi ini kami sampaikan. Terima kasih`,
    `__`,
    `Best Regards,`,
    ``,
    NAMA(),
    tagline || null,
  ].filter((x): x is string => Boolean(x));
  return { judul: `Tagihan ${t.periode} — ${NAMA()}`, pesan: baris.join("\n") };
}

export function templateReminder(t: TagihanWa, sisaHari: number): { judul: string; pesan: string } {
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
      `💳 Bayar online: ${t.link}`,
      `Terima kasih 🙏`,
      ``,
      `— ${NAMA()}`,
    ].join("\n"),
  };
}

export function templateTunggakan(t: TagihanWa): { judul: string; pesan: string } {
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
      `💳 Segera bayar: ${t.link}`,
      `Agar layanan pengangkutan sampah tetap berjalan tanpa kendala.`,
      ``,
      `— ${NAMA()}`,
    ].join("\n"),
  };
}

export function templatePembayaranDiterima(t: TagihanWa, metode: string): { judul: string; pesan: string } {
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
      `Terima kasih! 🙏`,
      ``,
      `— ${NAMA()}`,
    ].join("\n"),
  };
}

export function templatePembayaranGagal(t: TagihanWa): { judul: string; pesan: string } {
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
    ].join("\n"),
  };
}

export function templatePendaftaranDiterima(nama: string, kode: string): { judul: string; pesan: string } {
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
      `Anda akan dihubungi jika pendaftaran disetujui.`,
      ``,
      `— ${NAMA()}`,
    ].join("\n"),
  };
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
  patokanLokasi?: string | null;
  referal?: string | null;
  tanggalPenagihanCustom?: string | null;
  jadwalHari?: string | null;
};

export function templatePendaftaranAdmin(p: PendaftaranAdmin): { judul: string; pesan: string } {
  const baris = [
    "📩 *PENDAFTARAN PELANGGAN BARU*",
    "",
    `👤 Nama: ${p.nama}`,
    `🆔 Kode: ${p.kodePelanggan}`,
    `📱 WhatsApp: ${p.noTelepon}`,
    `📍 Alamat: ${p.alamat}`,
  ];
  if (p.paket) baris.push(`📦 Paket: ${p.paket}`);
  if (p.kategori) baris.push(`🗂 Kategori: ${p.kategori}`);
  if (p.tanggalPenagihanCustom) baris.push(`🗓 Req Tgl Penagihan: ${p.tanggalPenagihanCustom}`);
  if (p.jadwalHari) baris.push(`🗓 Req Hari Jemput: ${p.jadwalHari}`);
  if (p.patokanLokasi) baris.push(`🧭 Patokan: ${p.patokanLokasi}`);
  if (p.referal) baris.push(`🤝 Referal: ${p.referal}`);
  baris.push("", `Segera konfirmasi di aplikasi ${NAMA()}.`, `— ${NAMA()}`);
  return { judul: `Pendaftaran Baru: ${p.nama}`, pesan: baris.join("\n") };
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
  buatPesan: (t: TargetWa) => { judul: string; pesan: string },
  opts?: { createdById?: number | null; autoSend?: boolean }
): Promise<BlastWaResult> {
  const hasil: BlastWaResult = { terkirim: 0, pending: 0, gagal: 0, failures: [], links: [] };
  const delay = blastDelayMs();

  for (const t of targets) {
    const { judul, pesan } = buatPesan(t);
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

export function templatePendaftaranDisetujui(nama: string, kode: string): { judul: string; pesan: string } {
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
      `Anda dapat menggunakan nomor WhatsApp Anda atau kode pelanggan untuk mengecek tagihan dan jadwal penjemputan di website kami.`,
      `Terima kasih telah bergabung.`,
      ``,
      `— ${NAMA()}`,
    ].join("\n"),
  };
}
