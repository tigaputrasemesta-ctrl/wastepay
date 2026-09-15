import { prisma } from "./prisma";

// Throttle: update tunggakan maks 1x per 5 menit per proses.
// updateTunggakan dipanggil dari GET publik (cek tagihan) & GET admin —
// tanpa throttle, setiap request memicu write massal ke DB (write-amplification
// + latency tinggi). Jalur utama penandaan tunggakan & denda adalah cron
// scripts/reminder-wa.mjs; panggilan dari GET hanyalah fallback penyegaran.
const THROTTLE_MS = 5 * 60 * 1000;
let lastRun = 0;

/**
 * Tandai tagihan lewat jatuh tempo sebagai "tunggakan" dan hitung denda
 * (2% per bulan keterlambatan).
 * @param opts.force true → selalu jalan (dipakai endpoint admin eksplisit
 *   POST /api/tagihan/tunggakan); false/default → throttle 5 menit.
 */
export async function updateTunggakan(opts?: { force?: boolean }): Promise<number> {
  const now = Date.now();
  if (!opts?.force && now - lastRun < THROTTLE_MS) return 0;
  lastRun = now;

  const overdue = await prisma.tagihan.findMany({
    where: {
      status: { in: ["belum_bayar", "tunggakan"] },
      jatuhTempo: { lt: new Date() },
      deletedAt: null,
    },
    select: { id: true, jumlah: true, denda: true, status: true, jatuhTempo: true },
  });

  const MS_PER_BULAN = 30 * 24 * 3600 * 1000;
  const nowDate = new Date();

  // Pra-hitung dan saring hanya tagihan yang nominal denda atau statusnya berubah
  const targets = overdue
    .map((t) => {
      const bulanTerlambat = Math.max(
        1,
        Math.floor((nowDate.getTime() - t.jatuhTempo.getTime()) / MS_PER_BULAN)
      );
      const denda = Math.round(t.jumlah * 0.02 * bulanTerlambat);
      const needUpdate = t.status !== "tunggakan" || t.denda !== denda;
      return { id: t.id, denda, needUpdate };
    })
    .filter((t) => t.needUpdate);

  // Update secara bertahap (chunk kecil) agar ramah connection pooler
  const CHUNK = 10;
  for (let i = 0; i < targets.length; i += CHUNK) {
    await Promise.all(
      targets.slice(i, i + CHUNK).map((t) =>
        prisma.tagihan.update({
          where: { id: t.id },
          data: { status: "tunggakan", denda: t.denda },
        })
      )
    );
  }

  return targets.length;
}

/** Total tagihan yang harus dibayar (termasuk denda) */
export function totalTagihan(jumlah: number, denda?: number | null): number {
  return jumlah + (denda || 0);
}

/**
 * Hitung tanggal jatuh tempo tagihan berdasarkan tanggal pendaftaran pelanggan (Anniversary Billing).
 * Konsumen yang daftar tgl 10 -> jatuh tempo tgl 10 di setiap bulan penagihan (nominal 1 bulan penuh).
 * Jika bulan tersebut tidak memiliki tanggal tersebut (misal daftar tgl 31, dan bulan Februari hanya ada 28/29 hari),
 * maka otomatis disesuaikan ke hari terakhir bulan tersebut.
 *
 * @param tanggalDaftar Tanggal pendaftaran / aktivasi pelanggan (createdAt)
 * @param bulan Bulan tagihan (1 - 12)
 * @param tahun Tahun tagihan (misal 2026)
 */
export function hitungJatuhTempoKonsumen(
  tanggalDaftar: Date | string | null | undefined,
  bulan: number,
  tahun: number
): Date {
  const d = tanggalDaftar ? new Date(tanggalDaftar) : null;
  // Jika tanggal daftar tidak valid, fallback default ke tanggal 15
  const hariSiklus = d && !isNaN(d.getTime()) ? d.getDate() : 15;

  // Hari maksimal pada bulan tujuan (misal Feb: 28/29, Apr: 30, Jan: 31)
  const maxHariBulan = new Date(tahun, bulan, 0).getDate();
  const hariJatuhTempo = Math.min(hariSiklus, maxHariBulan);

  return new Date(tahun, bulan - 1, hariJatuhTempo, 23, 59, 59);
}

