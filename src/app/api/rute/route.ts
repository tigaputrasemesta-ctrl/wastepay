import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { toBoolean } from "@/lib/utils";

export async function GET() {
  const rute = await prisma.rute.findMany({
    include: {
      kelurahan: { select: { id: true, nama: true, kecamatan: true } },
      kelurahans: { select: { id: true, nama: true, kecamatan: true } },
      zona: { select: { id: true, nama: true, kelurahanId: true } },
      zonas: { select: { id: true, nama: true, kelurahanId: true } },
      petugas: { select: { id: true, nama: true, jabatan: true } },
      _count: { select: { jadwal: true } },
    },
    orderBy: [{ nama: "asc" }], // Changed orderBy since kelurahan is no longer 1:1
  });
  return NextResponse.json(rute);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, hari, jam, kelurahanId, kelurahanIds, petugasId, zonaId, zonaIds, aktif } = body;

    // Support single kelurahanId or multiple kelurahanIds
    const parsedKelurahanIds: number[] = [];
    if (kelurahanIds && Array.isArray(kelurahanIds)) {
      parsedKelurahanIds.push(...kelurahanIds.map((k: string) => parseInt(k)).filter(n => !isNaN(n)));
    } else if (kelurahanId) {
      parsedKelurahanIds.push(parseInt(kelurahanId));
    }
    const kelurahanIdAkhir = parsedKelurahanIds.length > 0 ? parsedKelurahanIds[0] : null;

    if (!nama || !hari || parsedKelurahanIds.length === 0) {
      return NextResponse.json({ error: "Nama, hari, dan kelurahan harus diisi" }, { status: 400 });
    }

    // Support single zonaId or multiple zonaIds
    const parsedZonaIds: number[] = [];
    if (zonaIds && Array.isArray(zonaIds)) {
      parsedZonaIds.push(...zonaIds.map((z: string) => parseInt(z)).filter(n => !isNaN(n)));
    } else if (zonaId) {
      parsedZonaIds.push(parseInt(zonaId));
    }
    const zonaIdAkhir = parsedZonaIds.length > 0 ? parsedZonaIds[0] : null;

    if (parsedZonaIds.length > 0) {
      const zonas = await prisma.zona.findMany({
        where: { id: { in: parsedZonaIds } },
        select: { id: true, kelurahanId: true },
      });
      if (zonas.some((z) => !parsedKelurahanIds.includes(z.kelurahanId))) {
        return NextResponse.json({ error: "Zona tidak sesuai dengan kelurahan yang dipilih" }, { status: 400 });
      }
    }

    const rute = await prisma.rute.create({
      data: {
        nama,
        hari,
        jam,
        aktif: aktif == null ? true : toBoolean(aktif),
        kelurahanId: kelurahanIdAkhir,
        kelurahans: parsedKelurahanIds.length > 0 ? { connect: parsedKelurahanIds.map((id) => ({ id })) } : undefined,
        zonaId: zonaIdAkhir,
        zonas: parsedZonaIds.length > 0 ? { connect: parsedZonaIds.map((id) => ({ id })) } : undefined,
        petugasId: petugasId ? parseInt(petugasId) : null,
      },
      include: {
        kelurahan: { select: { id: true, nama: true, kecamatan: true } },
        kelurahans: { select: { id: true, nama: true, kecamatan: true } },
        zona: { select: { id: true, nama: true } },
        petugas: { select: { id: true, nama: true } },
      },
    });

    await logAudit("create", "Rute", rute.id, undefined, { nama: rute.nama });
    return NextResponse.json(rute, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah rute" }, { status: 500 });
  }
}
