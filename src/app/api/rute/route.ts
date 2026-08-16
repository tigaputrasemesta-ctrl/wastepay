import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { toBoolean } from "@/lib/utils";

export async function GET() {
  const rute = await prisma.rute.findMany({
    include: {
      kelurahan: { select: { id: true, nama: true, kecamatan: true } },
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
    const { nama, hari, jam, kelurahanId, petugasId, aktif } = body;

    if (!nama || !hari || !kelurahanId) {
      return NextResponse.json({ error: "Nama, hari, dan kelurahan harus diisi" }, { status: 400 });
    }

    const rute = await prisma.rute.create({
      data: {
        nama,
        hari,
        jam,
        aktif: aktif == null ? true : toBoolean(aktif),
        kelurahanId: parseInt(kelurahanId),
        petugasId: petugasId ? parseInt(petugasId) : null,
      },
      include: { kelurahan: { select: { id: true, nama: true, kecamatan: true } }, petugas: { select: { id: true, nama: true } } },
    });

    await logAudit("create", "Rute", rute.id, undefined, { nama: rute.nama });
    return NextResponse.json(rute, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah rute" }, { status: 500 });
  }
}
