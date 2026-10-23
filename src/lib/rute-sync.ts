import { prisma } from "@/lib/prisma";
import { DAFTAR_HARI, NamaHari } from "@/lib/penugasan-jadwal";

export type SyncRuteResult = {
  success: boolean;
  ruteId: number;
  ruteNama: string;
  pelangganCount: number;
  jadwalCreated: number;
  hari: string[];
  message?: string;
};

/**
 * Sinkronisasi otomatis pelanggan ke jadwal penjemputan rute.
 *
 * Mengambil seluruh pelanggan aktif yang berada di zona atau kelurahan yang dicakup oleh rute ini,
 * lalu membuat / mengaktifkan record Jadwal untuk setiap hari layanan rute tersebut.
 */
export async function sinkronkanPelangganRute(ruteId: number): Promise<SyncRuteResult> {
  const rute = await prisma.rute.findUnique({
    where: { id: ruteId },
    include: {
      kelurahans: { select: { id: true, nama: true } },
      zonas: { select: { id: true, nama: true, kelurahanId: true } },
      kelurahan: { select: { id: true, nama: true } },
      zona: { select: { id: true, nama: true, kelurahanId: true } },
    },
  });

  if (!rute) {
    throw new Error(`Rute #${ruteId} tidak ditemukan`);
  }

  // Parse hari layanan aktif (misal "Senin,Rabu,Jumat")
  const hariList = (rute.hari || "")
    .split(",")
    .map((s) => s.trim())
    .filter((h): h is string => DAFTAR_HARI.includes(h as NamaHari));

  if (hariList.length === 0) {
    return {
      success: true,
      ruteId: rute.id,
      ruteNama: rute.nama,
      pelangganCount: 0,
      jadwalCreated: 0,
      hari: [],
      message: "Rute tidak memiliki hari layanan aktif",
    };
  }

  // Kumpulkan Zona IDs yang dicakup rute
  const zonaIds = new Set<number>();
  if (rute.zonaId) zonaIds.add(rute.zonaId);
  if (rute.zonas && Array.isArray(rute.zonas)) {
    rute.zonas.forEach((z) => zonaIds.add(z.id));
  }

  // Kumpulkan Kelurahan IDs yang dicakup rute
  const kelurahanIds = new Set<number>();
  if (rute.kelurahanId) kelurahanIds.add(rute.kelurahanId);
  if (rute.kelurahans && Array.isArray(rute.kelurahans)) {
    rute.kelurahans.forEach((k) => kelurahanIds.add(k.id));
  }

  const zonaIdArr = Array.from(zonaIds);
  const kelIdArr = Array.from(kelurahanIds);

  if (zonaIdArr.length === 0 && kelIdArr.length === 0) {
    return {
      success: true,
      ruteId: rute.id,
      ruteNama: rute.nama,
      pelangganCount: 0,
      jadwalCreated: 0,
      hari: hariList,
      message: "Rute belum memiliki cakupan zona atau kelurahan",
    };
  }

  // Buat query OR untuk mencocokkan pelanggan
  const orConditions: any[] = [];
  if (zonaIdArr.length > 0) {
    orConditions.push({
      wilayah: { zonaId: { in: zonaIdArr } },
    });
  }
  if (kelIdArr.length > 0) {
    orConditions.push({
      kelurahanId: { in: kelIdArr },
    });
  }

  const pelangganList = await prisma.pelanggan.findMany({
    where: {
      deletedAt: null,
      status: "aktif",
      OR: orConditions,
    },
    select: {
      id: true,
      nama: true,
      alamat: true,
      kelurahanId: true,
      wilayahId: true,
      wilayah: { select: { zonaId: true } },
    },
  });

  const finalJam = rute.jam && rute.jam.trim() ? rute.jam.trim() : "08:00";
  let jadwalCreated = 0;

  for (const p of pelangganList) {
    for (const h of hariList) {
      await prisma.jadwal.upsert({
        where: {
          pelangganId_ruteId_hari: {
            pelangganId: p.id,
            ruteId: rute.id,
            hari: h,
          },
        },
        create: {
          pelangganId: p.id,
          ruteId: rute.id,
          hari: h,
          jam: finalJam,
          aktif: true,
        },
        update: {
          aktif: true,
          jam: finalJam,
        },
      });
      jadwalCreated++;
    }

    // Nonaktifkan hari yang tidak lagi masuk dalam rute ini
    await prisma.jadwal.updateMany({
      where: {
        pelangganId: p.id,
        ruteId: rute.id,
        hari: { notIn: hariList },
      },
      data: { aktif: false },
    });
  }

  return {
    success: true,
    ruteId: rute.id,
    ruteNama: rute.nama,
    pelangganCount: pelangganList.length,
    jadwalCreated,
    hari: hariList,
  };
}

/**
 * Sinkronkan seluruh rute aktif dengan pelanggan di cakupan masing-masing.
 */
export async function sinkronkanSemuaRute() {
  const activeRoutes = await prisma.rute.findMany({
    where: { aktif: true },
    select: { id: true, nama: true },
  });

  let totalPelangganLinked = 0;
  let totalJadwalCreated = 0;
  const details: SyncRuteResult[] = [];

  for (const r of activeRoutes) {
    try {
      const res = await sinkronkanPelangganRute(r.id);
      totalPelangganLinked += res.pelangganCount;
      totalJadwalCreated += res.jadwalCreated;
      details.push(res);
    } catch (err) {
      console.warn(`[sinkronkanSemuaRute] Error syncing rute #${r.id}:`, err);
    }
  }

  return {
    success: true,
    rutesProcessed: activeRoutes.length,
    totalPelangganLinked,
    totalJadwalCreated,
    details,
  };
}

/**
 * Ambil daftar pelanggan yang berada di cakupan rute ini beserta jadwal aktifnya.
 */
export async function getPelangganRuteDetail(ruteId: number) {
  const rute = await prisma.rute.findUnique({
    where: { id: ruteId },
    include: {
      kelurahans: { select: { id: true, nama: true } },
      zonas: { select: { id: true, nama: true, kelurahanId: true } },
      kelurahan: { select: { id: true, nama: true } },
      zona: { select: { id: true, nama: true, kelurahanId: true } },
      kendaraan: { select: { id: true, nama: true, platNomor: true, jenis: true } },
      petugas: { select: { id: true, nama: true } },
    },
  });

  if (!rute) {
    throw new Error(`Rute #${ruteId} tidak ditemukan`);
  }

  const zonaIds = new Set<number>();
  if (rute.zonaId) zonaIds.add(rute.zonaId);
  if (rute.zonas && Array.isArray(rute.zonas)) {
    rute.zonas.forEach((z) => zonaIds.add(z.id));
  }

  const kelurahanIds = new Set<number>();
  if (rute.kelurahanId) kelurahanIds.add(rute.kelurahanId);
  if (rute.kelurahans && Array.isArray(rute.kelurahans)) {
    rute.kelurahans.forEach((k) => kelurahanIds.add(k.id));
  }

  const zonaIdArr = Array.from(zonaIds);
  const kelIdArr = Array.from(kelurahanIds);

  const orConditions: any[] = [];
  if (zonaIdArr.length > 0) {
    orConditions.push({ wilayah: { zonaId: { in: zonaIdArr } } });
  }
  if (kelIdArr.length > 0) {
    orConditions.push({ kelurahanId: { in: kelIdArr } });
  }

  const pelanggan = orConditions.length > 0
    ? await prisma.pelanggan.findMany({
        where: {
          deletedAt: null,
          status: "aktif",
          OR: orConditions,
        },
        include: {
          kelurahan: { select: { id: true, nama: true } },
          wilayah: {
            select: {
              id: true,
              nama: true,
              zonaId: true,
              zona: { select: { id: true, nama: true } },
            },
          },
          jadwal: {
            where: { ruteId: rute.id, aktif: true },
            select: { id: true, hari: true, jam: true, aktif: true },
          },
        },
        orderBy: [{ nama: "asc" }],
      })
    : [];

  return {
    rute,
    pelanggan,
  };
}

/**
 * Atur setting hari penjemputan khusus untuk satu pelanggan di rute ini.
 */
export async function aturSettingHariPelanggan(opts: {
  ruteId: number;
  pelangganId: number;
  hariList: string[];
  jam?: string | null;
}) {
  const { ruteId, pelangganId, hariList, jam } = opts;
  const finalJam = jam && jam.trim() ? jam.trim() : "08:00";

  const validHari = hariList.filter((h): h is string => DAFTAR_HARI.includes(h as NamaHari));

  // Nonaktifkan hari yang tidak lagi dipilih
  await prisma.jadwal.updateMany({
    where: {
      pelangganId,
      ruteId,
      hari: { notIn: validHari },
    },
    data: { aktif: false },
  });

  // Upsert hari yang dipilih
  for (const h of validHari) {
    await prisma.jadwal.upsert({
      where: {
        pelangganId_ruteId_hari: {
          pelangganId,
          ruteId,
          hari: h,
        },
      },
      create: {
        pelangganId,
        ruteId,
        hari: h,
        jam: finalJam,
        aktif: true,
      },
      update: {
        aktif: true,
        jam: finalJam,
      },
    });
  }

  return { success: true, pelangganId, ruteId, hari: validHari };
}
