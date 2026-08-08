import { prisma } from "./prisma";

/**
 * Tandai tagihan lewat jatuh tempo sebagai "tunggakan" dan hitung denda
 * (2% per bulan keterlambatan). Dipanggil saat GET tagihan dan generate.
 */
export async function updateTunggakan(): Promise<number> {
  const now = new Date();
  const overdue = await prisma.tagihan.findMany({
    where: {
      status: "belum_bayar",
      jatuhTempo: { lt: now },
      deletedAt: null,
    },
    select: { id: true, jumlah: true, jatuhTempo: true },
  });

  const MS_PER_BULAN = 30 * 24 * 3600 * 1000;

  for (const t of overdue) {
    const bulanTerlambat = Math.max(
      1,
      Math.floor((now.getTime() - t.jatuhTempo.getTime()) / MS_PER_BULAN)
    );
    const denda = Math.round(t.jumlah * 0.02 * bulanTerlambat);

    await prisma.tagihan.update({
      where: { id: t.id },
      data: { status: "tunggakan", denda },
    });
  }

  return overdue.length;
}

/** Total tagihan yang harus dibayar (termasuk denda) */
export function totalTagihan(jumlah: number, denda?: number | null): number {
  return jumlah + (denda || 0);
}
