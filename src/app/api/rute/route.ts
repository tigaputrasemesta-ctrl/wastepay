import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { toBoolean } from "@/lib/utils";

export async function GET() {
  const rute = await prisma.rute.findMany({
    include: {
      wilayah: true,
      petugas: { select: { id: true, nama: true } },
      _count: { select: { jadwal: true } },
    },
    orderBy: [{ wilayah: { nama: "asc" } }, { nama: "asc" }],
  });
  return NextResponse.json(rute);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, hari, jam, wilayahId, petugasId, aktif } = body;

    if (!nama || !hari || !wilayahId) {
      return NextResponse.json({ error: "Nama, hari, dan wilayah harus diisi" }, { status: 400 });
    }

    const rute = await prisma.rute.create({
      data: {
        nama,
        hari,
        jam,
        aktif: aktif == null ? true : toBoolean(aktif),
        wilayahId: parseInt(wilayahId),
        petugasId: petugasId ? parseInt(petugasId) : null,
      },
      include: { wilayah: true, petugas: { select: { id: true, nama: true } } },
    });

    await logAudit("create", "Rute", rute.id, undefined, { nama: rute.nama });
    return NextResponse.json(rute, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah rute" }, { status: 500 });
  }
}
