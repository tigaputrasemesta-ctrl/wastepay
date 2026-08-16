import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { toBoolean } from "@/lib/utils";

export async function GET() {
  const rute = await prisma.rute.findMany({
    include: {
      kelurahan: { select: { id: true, nama: true, kecamatan: true } },
      zona: { select: { id: true, nama: true, kelurahanId: true } },
      petugas: { select: { id: true, nama: true, jabatan: true } },
      _count: { select: { jadwal: true } },
    },
    orderBy: [{ kelurahan: { nama: "asc" } }, { nama: "asc" }],
  });
  return NextResponse.json(rute);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, hari, jam, kelurahanId, petugasId, zonaId, aktif } = body;

    if (!nama || !hari || !kelurahanId) {
      return NextResponse.json({ error: "Nama, hari, dan kelurahan harus diisi" }, { status: 400 });
    }

    // Validasi zona (jika dipilih) harus berada di kelurahan yang sama
    const zonaIdAkhir = zonaId ? parseInt(zonaId) : null;
    if (zonaIdAkhir) {
      const zona = await prisma.zona.findUnique({
        where: { id: zonaIdAkhir },
        select: { kelurahanId: true },
      });
      if (!zona || zona.kelurahanId !== parseInt(kelurahanId)) {
        return NextResponse.json({ error: "Zona tidak sesuai dengan kelurahan yang dipilih" }, { status: 400 });
      }
    }

    const rute = await prisma.rute.create({
      data: {
        nama,
        hari,
        jam,
        aktif: aktif == null ? true : toBoolean(aktif),
        kelurahanId: parseInt(kelurahanId),
        zonaId: zonaIdAkhir,
        petugasId: petugasId ? parseInt(petugasId) : null,
      },
      include: {
        kelurahan: { select: { id: true, nama: true, kecamatan: true } },
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
