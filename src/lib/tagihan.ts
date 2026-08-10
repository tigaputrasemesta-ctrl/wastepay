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
      status: "belum_bayar",
      jatuhTempo: { lt: new Date() },
      deletedAt: null,
    },
    select: { id: true, jumlah: true, jatuhTempo: true },
  });

  const MS_PER_BULAN = 30 * 24 * 3600 * 1000;
  const nowDate = new Date();

  // Update paralel ber-chunk (pool DB max 10) — jauh lebih cepat daripada
  // serial 1-per-1 untuk ribuan tagihan tunggakan.
  const CHUNK = 20;
  for (let i = 0; i < overdue.length; i += CHUNK) {
    await Promise.all(
      overdue.slice(i, i + CHUNK).map(async (t) => {
        const bulanTerlambat = Math.max(
          1,
          Math.floor((nowDate.getTime() - t.jatuhTempo.getTime()) / MS_PER_BULAN)
        );
        const denda = Math.round(t.jumlah * 0.02 * bulanTerlambat);

        await prisma.tagihan.update({
          where: { id: t.id },
          data: { status: "tunggakan", denda },
        });
      })
    );
  }

  return overdue.length;
}

/** Total tagihan yang harus dibayar (termasuk denda) */
export function totalTagihan(jumlah: number, denda?: number | null): number {
  return jumlah + (denda || 0);
}
