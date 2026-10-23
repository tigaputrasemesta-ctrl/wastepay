import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { toBoolean } from "@/lib/utils";
import { ensureArmadaRuteSchema } from "@/lib/db-patch";
import { sinkronkanPelangganRute } from "@/lib/rute-sync";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureArmadaRuteSchema();
    const id = parseInt((await params).id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID rute tidak valid" }, { status: 400 });
    }

    let rute;
    try {
      rute = await prisma.rute.findUnique({
        where: { id },
        include: {
          kelurahan: { select: { id: true, nama: true, kecamatan: true } },
          kelurahans: { select: { id: true, nama: true, kecamatan: true } },
          zona: { select: { id: true, nama: true, kelurahanId: true } },
          zonas: { select: { id: true, nama: true, kelurahanId: true } },
          kendaraan: { select: { id: true, nama: true, platNomor: true, jenis: true } },
          petugas: { select: { id: true, nama: true } },
          jadwal: {
            include: {
              pelanggan: {
                select: {
                  id: true,
                  nama: true,
                  alamat: true,
                  noTelepon: true,
                  fotoRumah: true,
                  patokanLokasi: true,
                  latitude: true,
                  longitude: true,
                },
              },
            },
          },
        },
      });
    } catch {
      try {
        const ruteBase = await prisma.rute.findUnique({
          where: { id },
          select: {
            id: true,
            nama: true,
            hari: true,
            jam: true,
            aktif: true,
            kelurahanId: true,
            zonaId: true,
            petugasId: true,
            kelurahan: { select: { id: true, nama: true, kecamatan: true } },
            kelurahans: { select: { id: true, nama: true, kecamatan: true } },
            zona: { select: { id: true, nama: true, kelurahanId: true } },
            zonas: { select: { id: true, nama: true, kelurahanId: true } },
            petugas: { select: { id: true, nama: true } },
            jadwal: {
              include: {
                pelanggan: {
                  select: {
                    id: true,
                    nama: true,
                    alamat: true,
                    noTelepon: true,
                    fotoRumah: true,
                    patokanLokasi: true,
                    latitude: true,
                    longitude: true,
                  },
                },
              },
            },
          },
        });
        if (ruteBase) {
          rute = { ...ruteBase, kendaraan: null, kendaraanId: null };
        }
      } catch {
        const minimalRute = await prisma.rute.findUnique({
          where: { id },
          select: {
            id: true,
            nama: true,
            hari: true,
            jam: true,
            aktif: true,
            kelurahanId: true,
            zonaId: true,
            petugasId: true,
            kelurahan: { select: { id: true, nama: true, kecamatan: true } },
            zona: { select: { id: true, nama: true, kelurahanId: true } },
            petugas: { select: { id: true, nama: true } },
          },
        });
        if (minimalRute) {
          rute = {
            ...minimalRute,
            kelurahans: minimalRute.kelurahan ? [minimalRute.kelurahan] : [],
            zonas: minimalRute.zona ? [minimalRute.zona] : [],
            kendaraan: null,
            kendaraanId: null,
            jadwal: [],
          };
        }
      }
    }

    if (!rute) {
      return NextResponse.json({ error: "Rute tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(rute);
  } catch (err: unknown) {
    console.error("GET /api/rute/[id] error:", err);
    return NextResponse.json({ error: "Gagal mengambil data rute" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureArmadaRuteSchema();
    const id = parseInt((await params).id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID rute tidak valid" }, { status: 400 });
    }

    const body = await request.json();
    const { nama, hari, jam, aktif, kelurahanId, kelurahanIds, kendaraanId, petugasId, zonaId, zonaIds } = body;

    const data: Record<string, unknown> = {};
    if (nama !== undefined) data.nama = String(nama).trim();
    if (hari !== undefined) data.hari = String(hari).trim();
    if (jam !== undefined) data.jam = jam ? String(jam).trim() : null;
    if (aktif !== undefined) data.aktif = toBoolean(aktif);

    // Normalisasi Kelurahan IDs
    let currentKelurahanIds: number[] = [];
    if (kelurahanIds !== undefined || kelurahanId !== undefined) {
      if (kelurahanIds && Array.isArray(kelurahanIds)) {
        currentKelurahanIds = kelurahanIds
          .map((k: string | number) => parseInt(String(k)))
          .filter((n) => !isNaN(n));
      } else if (kelurahanId) {
        const parsed = parseInt(String(kelurahanId));
        if (!isNaN(parsed)) currentKelurahanIds = [parsed];
      }

      data.kelurahanId = currentKelurahanIds.length > 0 ? currentKelurahanIds[0] : null;
      data.kelurahans = { set: currentKelurahanIds.map((id) => ({ id })) };
      data.wilayahId = null;
    }

    const parsedKendaraanId = kendaraanId !== undefined ? (kendaraanId ? parseInt(String(kendaraanId)) : null) : undefined;
    const parsedPetugasId = petugasId !== undefined ? (petugasId ? parseInt(String(petugasId)) : null) : undefined;

    if (parsedPetugasId !== undefined) data.petugasId = parsedPetugasId;

    // Normalisasi Zona IDs
    let parsedZonaIds: number[] = [];
    if (zonaIds !== undefined || zonaId !== undefined) {
      if (zonaIds && Array.isArray(zonaIds)) {
        parsedZonaIds = zonaIds
          .map((z: string | number) => parseInt(String(z)))
          .filter((n) => !isNaN(n));
      } else if (zonaId) {
        const parsed = parseInt(String(zonaId));
        if (!isNaN(parsed)) parsedZonaIds = [parsed];
      }

      data.zonaId = parsedZonaIds.length > 0 ? parsedZonaIds[0] : null;
      data.zonas = { set: parsedZonaIds.map((id) => ({ id })) };
    }

    type RutePutResult = {
      id: number;
      nama: string;
      hari: string;
      jam: string | null;
      aktif: boolean;
      kelurahanId: number | null;
      zonaId: number | null;
      kendaraanId?: number | null;
      petugasId: number | null;
      kelurahan?: { id: number; nama: string; kecamatan: string | null } | null;
      kelurahans?: { id: number; nama: string; kecamatan: string | null }[];
      zona?: { id: number; nama: string } | null;
      zonas?: { id: number; nama: string }[];
      kendaraan?: { id: number; nama: string; platNomor: string | null; jenis: string } | null;
      petugas?: { id: number; nama: string } | null;
    };

    let rute: RutePutResult;

    // TIER 1: Update lengkap dengan kendaraanId jika ada
    try {
      const tier1Data = { ...data };
      if (parsedKendaraanId !== undefined) {
        tier1Data.kendaraanId = parsedKendaraanId;
      }

      rute = await prisma.rute.update({
        where: { id },
        data: tier1Data,
        select: {
          id: true,
          nama: true,
          hari: true,
          jam: true,
          aktif: true,
          kelurahanId: true,
          zonaId: true,
          kendaraanId: true,
          petugasId: true,
          kelurahan: { select: { id: true, nama: true, kecamatan: true } },
          kelurahans: { select: { id: true, nama: true, kecamatan: true } },
          zona: { select: { id: true, nama: true } },
          zonas: { select: { id: true, nama: true } },
          kendaraan: { select: { id: true, nama: true, platNomor: true, jenis: true } },
          petugas: { select: { id: true, nama: true } },
        },
      });
    } catch (tier1Err) {
      console.warn("Tier 1 rute update failed, attempting Tier 2 (without kendaraanId):", tier1Err);

      // TIER 2: Update tanpa kendaraanId
      try {
        const tier2Data = { ...data };
        delete tier2Data.kendaraanId;

        const ruteT2 = await prisma.rute.update({
          where: { id },
          data: tier2Data,
          select: {
            id: true,
            nama: true,
            hari: true,
            jam: true,
            aktif: true,
            kelurahanId: true,
            zonaId: true,
            petugasId: true,
            kelurahan: { select: { id: true, nama: true, kecamatan: true } },
            kelurahans: { select: { id: true, nama: true, kecamatan: true } },
            zona: { select: { id: true, nama: true } },
            zonas: { select: { id: true, nama: true } },
            petugas: { select: { id: true, nama: true } },
          },
        });
        rute = {
          ...ruteT2,
          kendaraanId: null,
          kendaraan: null,
        };
      } catch (tier2Err) {
        console.warn("Tier 2 rute update failed, attempting Tier 3 (scalar fields only):", tier2Err);

        // TIER 3: Update hanya field skalar standar (tanpa join table M:N)
        const scalarData: Record<string, unknown> = {};
        if (data.nama !== undefined) scalarData.nama = data.nama;
        if (data.hari !== undefined) scalarData.hari = data.hari;
        if (data.jam !== undefined) scalarData.jam = data.jam;
        if (data.aktif !== undefined) scalarData.aktif = data.aktif;
        if (data.kelurahanId !== undefined) scalarData.kelurahanId = data.kelurahanId;
        if (data.zonaId !== undefined) scalarData.zonaId = data.zonaId;
        if (data.petugasId !== undefined) scalarData.petugasId = data.petugasId;

        const ruteT3 = await prisma.rute.update({
          where: { id },
          data: scalarData,
          select: {
            id: true,
            nama: true,
            hari: true,
            jam: true,
            aktif: true,
            kelurahanId: true,
            zonaId: true,
            petugasId: true,
            kelurahan: { select: { id: true, nama: true, kecamatan: true } },
            zona: { select: { id: true, nama: true } },
            petugas: { select: { id: true, nama: true } },
          },
        });
        rute = {
          ...ruteT3,
          kelurahans: ruteT3.kelurahan ? [ruteT3.kelurahan] : [],
          zonas: ruteT3.zona ? [ruteT3.zona] : [],
          kendaraanId: null,
          kendaraan: null,
        };
      }
    }

    try {
      await logAudit("update", "Rute", id, { id }, { nama: rute.nama, aktif: rute.aktif });
    } catch (auditErr) {
      console.warn("Audit log notice (non-fatal):", auditErr);
    }

    // Sync ZonaPetugas (non-blocking)
    const finalPetugasId = parsedPetugasId !== undefined ? parsedPetugasId : rute.petugasId;
    if (finalPetugasId && parsedZonaIds.length > 0) {
      try {
        await prisma.zonaPetugas.createMany({
          data: parsedZonaIds.map((zId) => ({
            zonaId: zId,
            petugasId: finalPetugasId,
          })),
          skipDuplicates: true,
        });
      } catch (syncErr) {
        console.warn("Sync ZonaPetugas notice (non-fatal):", syncErr);
      }
    }

    // Auto-sync pelanggan di cakupan rute ini ke Jadwal (non-blocking / resilient)
    if (body.autoSync !== false) {
      try {
        await sinkronkanPelangganRute(rute.id);
      } catch (syncPelangganErr) {
        console.warn("Auto-sync pelanggan rute notice (non-fatal):", syncPelangganErr);
      }
    }

    return NextResponse.json(rute);
  } catch (err: unknown) {
    console.error("PUT /api/rute/[id] fatal error:", err);
    const msg = err instanceof Error ? err.message : "Gagal mengupdate rute";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    if (isNaN(id)) {
      return NextResponse.json({ error: "ID rute tidak valid" }, { status: 400 });
    }

    const rute = await prisma.rute.findUnique({
      where: { id },
      select: { id: true, nama: true },
    });
    if (!rute) {
      return NextResponse.json({ error: "Rute tidak ditemukan" }, { status: 404 });
    }

    // Cascade delete aman: unlink pengangkutan dari jadwal rute ini, hapus jadwal, lalu hapus rute
    await prisma.$transaction(async (tx) => {
      const jadwals = await tx.jadwal.findMany({
        where: { ruteId: id },
        select: { id: true },
      });

      if (jadwals.length > 0) {
        const jadwalIds = jadwals.map((j) => j.id);
        await tx.pengangkutan.updateMany({
          where: { jadwalId: { in: jadwalIds } },
          data: { jadwalId: null },
        });
        await tx.jadwal.deleteMany({
          where: { ruteId: id },
        });
      }

      await tx.rute.delete({
        where: { id },
      });
    });

    await logAudit("delete", "Rute", id, { id, nama: rute.nama }, undefined);
    return NextResponse.json({ message: "Rute berhasil dihapus" });
  } catch (err: unknown) {
    console.error("DELETE /api/rute/[id] error:", err);
    const message = (err as Error)?.message || "Gagal menghapus rute";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
