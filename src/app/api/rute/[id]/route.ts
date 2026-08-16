import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { toBoolean } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const rute = await prisma.rute.findUnique({
      where: { id },
      include: {
        kelurahan: { select: { id: true, nama: true, kecamatan: true } },
        petugas: { select: { id: true, nama: true } },
        jadwal: {
          include: { pelanggan: { select: { id: true, nama: true, alamat: true } } },
        },
      },
    });
    if (!rute) {
      return NextResponse.json({ error: "Rute tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(rute);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data rute" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { nama, hari, jam, aktif, kelurahanId, petugasId } = body;

    const data: Record<string, unknown> = {};
    if (nama !== undefined) data.nama = nama;
    if (hari !== undefined) data.hari = hari;
    if (jam !== undefined) data.jam = jam;
    if (aktif !== undefined) data.aktif = toBoolean(aktif);
    if (kelurahanId !== undefined) {
      data.kelurahanId = kelurahanId ? parseInt(kelurahanId) : null;
      // wilayahId sudah tidak dipakai — scope rute via kelurahan
      data.wilayahId = null;
    }
    if (petugasId !== undefined) data.petugasId = petugasId ? parseInt(petugasId) : null;

    const rute = await prisma.rute.update({
      where: { id },
      data,
      include: {
        kelurahan: { select: { id: true, nama: true, kecamatan: true } },
        petugas: { select: { id: true, nama: true } },
      },
    });

    await logAudit("update", "Rute", id, { id }, { nama: rute.nama, aktif: rute.aktif });
    return NextResponse.json(rute);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate rute" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    await prisma.rute.delete({ where: { id } });
    await logAudit("delete", "Rute", id, { id }, undefined);
    return NextResponse.json({ message: "Rute berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus rute" }, { status: 500 });
  }
}
