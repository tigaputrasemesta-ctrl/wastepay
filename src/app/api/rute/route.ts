import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { toBoolean } from "@/lib/utils";
import { ensureArmadaRuteSchema } from "@/lib/db-patch";

export async function GET() {
  try {
    await ensureArmadaRuteSchema();
    const rute = await prisma.rute.findMany({
      include: {
        kelurahan: { select: { id: true, nama: true, kecamatan: true } },
        kelurahans: { select: { id: true, nama: true, kecamatan: true } },
        zona: { select: { id: true, nama: true, kelurahanId: true } },
        zonas: { select: { id: true, nama: true, kelurahanId: true } },
        kendaraan: { select: { id: true, nama: true, platNomor: true, jenis: true } },
        petugas: { select: { id: true, nama: true, jabatan: true } },
        _count: { select: { jadwal: true } },
      },
      orderBy: [{ nama: "asc" }],
    });
    return NextResponse.json(rute);
  } catch (err: unknown) {
    console.warn("Primary rute query error, attempting Tier 2 fallback:", err);
    try {
      const ruteBase = await prisma.rute.findMany({
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
          petugas: { select: { id: true, nama: true, jabatan: true } },
          _count: { select: { jadwal: true } },
        },
        orderBy: [{ nama: "asc" }],
      });
      return NextResponse.json(
        ruteBase.map((r) => ({
          ...r,
          kendaraanId: null,
          kendaraan: null,
        }))
      );
    } catch (fallbackErr: unknown) {
      console.warn("Tier 2 fallback failed, attempting Tier 3 minimal fallback:", fallbackErr);
      try {
        const minimalRute = await prisma.rute.findMany({
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
            petugas: { select: { id: true, nama: true, jabatan: true } },
            _count: { select: { jadwal: true } },
          },
          orderBy: [{ nama: "asc" }],
        });
        return NextResponse.json(
          minimalRute.map((r) => ({
            ...r,
            kelurahans: r.kelurahan ? [r.kelurahan] : [],
            zonas: r.zona ? [r.zona] : [],
            kendaraanId: null,
            kendaraan: null,
          }))
        );
      } catch (superErr: unknown) {
        const msg = superErr instanceof Error ? superErr.message : "Gagal memuat rute";
        return NextResponse.json({ error: msg }, { status: 500 });
      }
    }
  }
}

export async function POST(request: Request) {
  try {
    await ensureArmadaRuteSchema();

    const body = await request.json();
    const { nama, hari, jam, kelurahanId, kelurahanIds, kendaraanId, petugasId, zonaId, zonaIds, aktif } = body;

    // Normalisasi dan parse kelurahan ID
    const parsedKelurahanIds: number[] = [];
    if (kelurahanIds && Array.isArray(kelurahanIds)) {
      parsedKelurahanIds.push(...kelurahanIds.map((k: string | number) => parseInt(String(k))).filter((n) => !isNaN(n)));
    } else if (kelurahanId) {
      const parsed = parseInt(String(kelurahanId));
      if (!isNaN(parsed)) parsedKelurahanIds.push(parsed);
    }

    // Normalisasi dan parse zona ID
    const parsedZonaIds: number[] = [];
    if (zonaIds && Array.isArray(zonaIds)) {
      parsedZonaIds.push(...zonaIds.map((z: string | number) => parseInt(String(z))).filter((n) => !isNaN(n)));
    } else if (zonaId) {
      const parsed = parseInt(String(zonaId));
      if (!isNaN(parsed)) parsedZonaIds.push(parsed);
    }

    // Jika user memilih zona, pastikan kelurahan asal zona otomatis masuk ke parsedKelurahanIds
    if (parsedZonaIds.length > 0) {
      try {
        const zonas = await prisma.zona.findMany({
          where: { id: { in: parsedZonaIds } },
          select: { id: true, kelurahanId: true },
        });
        zonas.forEach((z) => {
          if (z.kelurahanId && !parsedKelurahanIds.includes(z.kelurahanId)) {
            parsedKelurahanIds.push(z.kelurahanId);
          }
        });
      } catch (errZona) {
        console.warn("[POST /api/rute] zona lookup warning:", errZona);
      }
    }

    const kelurahanIdAkhir = parsedKelurahanIds.length > 0 ? parsedKelurahanIds[0] : null;
    const zonaIdAkhir = parsedZonaIds.length > 0 ? parsedZonaIds[0] : null;

    if (!nama || !String(nama).trim()) {
      return NextResponse.json({ error: "Nama rute wajib diisi" }, { status: 400 });
    }
    if (!hari || !String(hari).trim()) {
      return NextResponse.json({ error: "Hari layanan wajib diisi" }, { status: 400 });
    }
    if (parsedKelurahanIds.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal satu kelurahan atau zona cakupan rute" },
        { status: 400 }
      );
    }

    const parsedKendaraanId = kendaraanId ? parseInt(String(kendaraanId)) : null;
    const parsedPetugasId = petugasId ? parseInt(String(petugasId)) : null;

    type RuteResult = {
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

    let rute: RuteResult;

    // TIER 1: Create dengan skema penuh (termasuk kendaraanId + M:N kelurahans + M:N zonas)
    try {
      rute = await prisma.rute.create({
        data: {
          nama: String(nama).trim(),
          hari: String(hari).trim(),
          jam: jam ? String(jam).trim() : null,
          aktif: aktif == null ? true : toBoolean(aktif),
          kelurahanId: kelurahanIdAkhir,
          kelurahans: parsedKelurahanIds.length > 0 ? { connect: parsedKelurahanIds.map((id) => ({ id })) } : undefined,
          zonaId: zonaIdAkhir,
          zonas: parsedZonaIds.length > 0 ? { connect: parsedZonaIds.map((id) => ({ id })) } : undefined,
          kendaraanId: parsedKendaraanId && !isNaN(parsedKendaraanId) ? parsedKendaraanId : null,
          petugasId: parsedPetugasId && !isNaN(parsedPetugasId) ? parsedPetugasId : null,
        },
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
      console.warn("Tier 1 rute create failed, attempting Tier 2 (without kendaraanId):", tier1Err);

      // TIER 2: Create tanpa kendaraanId (tetap menjaga integritas multi-kelurahan & multi-zona)
      try {
        const ruteT2 = await prisma.rute.create({
          data: {
            nama: String(nama).trim(),
            hari: String(hari).trim(),
            jam: jam ? String(jam).trim() : null,
            aktif: aktif == null ? true : toBoolean(aktif),
            kelurahanId: kelurahanIdAkhir,
            kelurahans: parsedKelurahanIds.length > 0 ? { connect: parsedKelurahanIds.map((id) => ({ id })) } : undefined,
            zonaId: zonaIdAkhir,
            zonas: parsedZonaIds.length > 0 ? { connect: parsedZonaIds.map((id) => ({ id })) } : undefined,
            petugasId: parsedPetugasId && !isNaN(parsedPetugasId) ? parsedPetugasId : null,
          },
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
        console.warn("Tier 2 rute create failed, attempting Tier 3 (pure legacy basic fields):", tier2Err);

        // TIER 3: Fallback ke kolom dasar skema legacy (kelurahanId, zonaId, petugasId, tanpa join table M:N)
        const ruteT3 = await prisma.rute.create({
          data: {
            nama: String(nama).trim(),
            hari: String(hari).trim(),
            jam: jam ? String(jam).trim() : null,
            aktif: aktif == null ? true : toBoolean(aktif),
            kelurahanId: kelurahanIdAkhir,
            zonaId: zonaIdAkhir,
            petugasId: parsedPetugasId && !isNaN(parsedPetugasId) ? parsedPetugasId : null,
          },
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
      await logAudit("create", "Rute", rute.id, undefined, { nama: rute.nama });
    } catch (auditErr) {
      console.warn("Audit log notice (non-fatal):", auditErr);
    }

    // Sync ZonaPetugas (non-blocking)
    if (parsedPetugasId && parsedZonaIds.length > 0) {
      try {
        await prisma.zonaPetugas.createMany({
          data: parsedZonaIds.map((zId) => ({
            zonaId: zId,
            petugasId: parsedPetugasId,
          })),
          skipDuplicates: true,
        });
      } catch (syncErr) {
        console.warn("Sync ZonaPetugas notice (non-fatal):", syncErr);
      }
    }

    return NextResponse.json(rute, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/rute fatal error:", err);
    const msg = err instanceof Error ? err.message : "Gagal menambah rute";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
