import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { nama, platNomor, jenis, kapasitas, petugasId, aktif } = body;

    const data: Record<string, unknown> = {};
    if (nama !== undefined) data.nama = nama;
    if (platNomor !== undefined) data.platNomor = platNomor || null;
    if (jenis !== undefined) data.jenis = jenis;
    if (kapasitas !== undefined) data.kapasitas = kapasitas ? parseFloat(kapasitas) : null;
    if (petugasId !== undefined) data.petugasId = petugasId ? parseInt(petugasId) : null;
    if (aktif !== undefined) data.aktif = aktif;

    const kendaraan = await prisma.kendaraan.update({
      where: { id },
      data,
      include: { petugas: { select: { id: true, nama: true } } },
    });

    await logAudit("update", "Kendaraan", id, { id }, { nama: kendaraan.nama, aktif: kendaraan.aktif });
    return NextResponse.json(kendaraan);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate kendaraan" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const id = parseInt((await params).id);
    await prisma.kendaraan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await logAudit("delete", "Kendaraan", id, { id }, undefined);
    return NextResponse.json({ message: "Kendaraan dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus kendaraan" }, { status: 500 });
  }
}
