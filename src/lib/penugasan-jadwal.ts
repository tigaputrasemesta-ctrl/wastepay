import { prisma } from "@/lib/prisma";

export const DAFTAR_HARI = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
  "Minggu",
] as const;

export type NamaHari = (typeof DAFTAR_HARI)[number];

export type PenugasanJadwalInput = {
  pelangganId: number;
  kelurahanId?: number | null;
  zonaId?: number | null;
  kendaraanId?: number | null; // Mobil armada penjemput utama
  petugasId?: number | null;   // Petugas supir / personil (opsional)
  ruteId?: number | null;
  hari?: string[] | string | null;
  jam?: string | null;
};

/**
 * Menghubungkan pelanggan dengan Mobil Armada Pickup (dan Petugas supir),
 * Zona Layanan, serta Jadwal Pengangkutan multi-hari.
 */
export async function tetapkanJadwalDanPetugasPelanggan({
  pelangganId,
  kelurahanId,
  zonaId,
  kendaraanId,
  petugasId,
  ruteId,
  hari,
  jam,
}: PenugasanJadwalInput): Promise<void> {
  // 1. Normalisasi daftar hari (bisa memilih lebih dari satu hari)
  let rawHari: string[] = [];
  if (Array.isArray(hari)) {
    rawHari = hari;
  } else if (typeof hari === "string") {
    rawHari = hari.split(",").map((s) => s.trim());
  }

  const hariList = rawHari
    .map((h) => h.trim())
    .filter((h): h is string => DAFTAR_HARI.includes(h as NamaHari));

  // Jika tidak ada hari dan tidak ada rute/kendaraan/petugas, lewati
  if (hariList.length === 0 && !ruteId && !kendaraanId && !petugasId) {
    return;
  }

  const finalJam = jam && jam.trim() ? jam.trim() : "08:00";
  const kidArmada = kendaraanId ? Number(kendaraanId) : null;
  const pid = petugasId ? Number(petugasId) : null;
  const zid = zonaId ? Number(zonaId) : null;
  const kid = kelurahanId ? Number(kelurahanId) : null;

  // 2. Tentukan atau cari Rute Armada
  let targetRuteId: number | null = ruteId ? Number(ruteId) : null;

  if (targetRuteId) {
    const existingRute = await prisma.rute.findUnique({
      where: { id: targetRuteId },
    });
    if (existingRute) {
      // Sinkronisasi armada atau petugas jika berbeda
      const updateData: Record<string, unknown> = {};
      if (kidArmada && existingRute.kendaraanId !== kidArmada) {
        updateData.kendaraanId = kidArmada;
      }
      if (pid && existingRute.petugasId !== pid) {
        updateData.petugasId = pid;
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.rute.update({
          where: { id: targetRuteId },
          data: updateData,
        });
      }
    } else {
      targetRuteId = null;
    }
  }

  // Jika targetRuteId belum ditentukan dan kendaraanId (Armada) dipilih (prioritas utama)
  if (!targetRuteId && kidArmada) {
    let ruteMatch = await prisma.rute.findFirst({
      where: {
        kendaraanId: kidArmada,
        aktif: true,
        ...(zid ? { zonaId: zid } : {}),
        ...(kid ? { kelurahanId: kid } : {}),
      },
    });

    if (!ruteMatch) {
      ruteMatch = await prisma.rute.findFirst({
        where: { kendaraanId: kidArmada, aktif: true },
      });
    }

    if (ruteMatch) {
      targetRuteId = ruteMatch.id;
    } else {
      // Auto-generate rute untuk mobil armada ini
      const [armada, zona, kel] = await Promise.all([
        prisma.kendaraan?.findUnique
          ? prisma.kendaraan.findUnique({
              where: { id: kidArmada },
              select: { nama: true, platNomor: true, petugasId: true },
            })
          : null,
        zid
          ? prisma.zona.findUnique({
              where: { id: zid },
              select: { nama: true },
            })
          : null,
        kid
          ? prisma.kelurahan.findUnique({
              where: { id: kid },
              select: { nama: true },
            })
          : null,
      ]);

      const platSuffix = armada?.platNomor ? ` (${armada.platNomor})` : "";
      const ruteNama = `Rute Armada ${armada?.nama || "Armada"}${platSuffix}${
        zona ? ` - ${zona.nama}` : kel ? ` - ${kel.nama}` : ""
      }`;

      const newRute = await prisma.rute.create({
        data: {
          nama: ruteNama,
          hari: hariList.length > 0 ? hariList.join(", ") : "Senin, Kamis",
          jam: finalJam,
          kendaraanId: kidArmada,
          petugasId: pid || armada?.petugasId || null,
          zonaId: zid,
          kelurahanId: kid,
          aktif: true,
        },
      });
      targetRuteId = newRute.id;
    }
  }

  // Jika targetRuteId belum ditentukan dan hanya petugasId yang ada (fallback kompatibilitas)
  if (!targetRuteId && pid) {
    // Coba deteksi mobil armada yang dikemudikan oleh petugas ini
    const armadaPetugas = prisma.kendaraan?.findFirst
      ? await prisma.kendaraan.findFirst({
          where: { petugasId: pid, aktif: true, deletedAt: null },
          select: { id: true },
        })
      : null;
    const autoKidArmada = armadaPetugas?.id || null;

    let ruteMatch = await prisma.rute.findFirst({
      where: {
        petugasId: pid,
        aktif: true,
        ...(zid ? { OR: [{ zonaId: zid }, { zonas: { some: { id: zid } } }] } : {}),
        ...(kid ? { OR: [{ kelurahanId: kid }, { kelurahans: { some: { id: kid } } }] } : {}),
      },
    });

    if (!ruteMatch) {
      ruteMatch = await prisma.rute.findFirst({
        where: { petugasId: pid, aktif: true },
      });
    }

    if (ruteMatch) {
      targetRuteId = ruteMatch.id;
    } else {
      // Auto-generate rute untuk petugas ini
      const petugas = await prisma.petugas.findUnique({
        where: { id: pid },
        select: { nama: true },
      });
      const zona = zid
        ? await prisma.zona.findUnique({
            where: { id: zid },
            select: { nama: true },
          })
        : null;
      const kel = kid
        ? await prisma.kelurahan.findUnique({
            where: { id: kid },
            select: { nama: true },
          })
        : null;

      const ruteNama = `Rute ${petugas?.nama || "Petugas"}${
        zona ? ` - ${zona.nama}` : kel ? ` - ${kel.nama}` : ""
      }`;

      const newRute = await prisma.rute.create({
        data: {
          nama: ruteNama,
          hari: hariList.length > 0 ? hariList.join(", ") : "Senin, Kamis",
          jam: finalJam,
          kendaraanId: autoKidArmada,
          petugasId: pid,
          zonaId: zid,
          kelurahanId: kid,
          aktif: true,
        },
      });
      targetRuteId = newRute.id;
    }
  }

  // Jika tetap belum ada targetRuteId, cari rute berdasarkan zona
  if (!targetRuteId && zid) {
    const ruteZona = await prisma.rute.findFirst({
      where: {
        aktif: true,
        OR: [{ zonaId: zid }, { zonas: { some: { id: zid } } }],
      },
    });
    if (ruteZona) {
      targetRuteId = ruteZona.id;
    } else {
      const zona = await prisma.zona.findUnique({
        where: { id: zid },
        select: { nama: true, kelurahanId: true },
      });
      const newRute = await prisma.rute.create({
        data: {
          nama: `Rute Area ${zona?.nama || `Zona ${zid}`}`,
          hari: hariList.length > 0 ? hariList.join(", ") : "Senin, Kamis",
          jam: finalJam,
          zonaId: zid,
          kelurahanId: kid ?? zona?.kelurahanId ?? null,
          aktif: true,
        },
      });
      targetRuteId = newRute.id;
    }
  }

  if (!targetRuteId) return;

  // 3. Simpan / Sinkronisasi Jadwal per hari yang dipilih
  if (hariList.length > 0) {
    // Nonaktifkan jadwal lama yang hari atau rutenya tidak lagi dipilih
    await prisma.jadwal.updateMany({
      where: {
        pelangganId,
        OR: [
          { ruteId: { not: targetRuteId } },
          { hari: { notIn: hariList } },
        ],
      },
      data: { aktif: false },
    });

    // Upsert setiap hari terpilih (multi-hari: misal Senin & Kamis)
    for (const h of hariList) {
      await prisma.jadwal.upsert({
        where: {
          pelangganId_ruteId_hari: {
            pelangganId,
            ruteId: targetRuteId,
            hari: h,
          },
        },
        create: {
          pelangganId,
          ruteId: targetRuteId,
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

    // Perbarui field ringkasan hari pada Rute jika belum tercakup
    try {
      const ruteSaatIni = await prisma.rute.findUnique({
        where: { id: targetRuteId },
        select: { hari: true },
      });
      if (ruteSaatIni) {
        const existingHariSet = new Set(
          ruteSaatIni.hari
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        );
        let changed = false;
        for (const h of hariList) {
          if (!existingHariSet.has(h)) {
            existingHariSet.add(h);
            changed = true;
          }
        }
        if (changed) {
          await prisma.rute.update({
            where: { id: targetRuteId },
            data: { hari: Array.from(existingHariSet).join(", ") },
          });
        }
      }
    } catch {
      // non-fatal
    }
  }
}
