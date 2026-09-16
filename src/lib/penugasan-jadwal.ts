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
  petugasId?: number | null;
  ruteId?: number | null;
  hari?: string[] | string | null;
  jam?: string | null;
};

/**
 * Menghubungkan pelanggan dengan Petugas Pickup, Zona, dan Jadwal Pengangkutan.
 * Mendukung pemilihan multi-hari penjemputan (lebih dari satu hari).
 */
export async function tetapkanJadwalDanPetugasPelanggan({
  pelangganId,
  kelurahanId,
  zonaId,
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

  // Jika tidak ada hari dan tidak ada rute/petugas, lewati
  if (hariList.length === 0 && !ruteId && !petugasId) {
    return;
  }

  const finalJam = jam && jam.trim() ? jam.trim() : "08:00";
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
      // Jika admin menetapkan petugasId pada rute ini
      if (pid && existingRute.petugasId !== pid) {
        await prisma.rute.update({
          where: { id: targetRuteId },
          data: { petugasId: pid },
        });
      }
    } else {
      targetRuteId = null;
    }
  }

  // Jika targetRuteId belum ditentukan, cari rute aktif milik petugas
  if (!targetRuteId && pid) {
    let ruteMatch = await prisma.rute.findFirst({
      where: {
        petugasId: pid,
        aktif: true,
        ...(zid ? { zonaId: zid } : {}),
        ...(kid ? { kelurahanId: kid } : {}),
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
      where: { zonaId: zid, aktif: true },
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
