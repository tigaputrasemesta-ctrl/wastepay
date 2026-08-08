import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const wilayah = await prisma.wilayah.findUnique({
      where: { id },
      include: {
        _count: { select: { pelanggan: true, petugas: true, rute: true } },
      },
    });
    if (!wilayah) {
      return NextResponse.json({ error: "Wilayah tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(wilayah);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data wilayah" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { nama, rt, rw, kelurahan, kecamatan, kota } = body;

    const data: Record<string, unknown> = {};
    if (nama !== undefined) data.nama = nama;
    if (rt !== undefined) data.rt = rt;
    if (rw !== undefined) data.rw = rw;
    if (kelurahan !== undefined) data.kelurahan = kelurahan;
    if (kecamatan !== undefined) data.kecamatan = kecamatan;
    if (kota !== undefined) data.kota = kota;

    const wilayah = await prisma.wilayah.update({
      where: { id },
      data,
    });

    await logAudit("update", "Wilayah", id, { id }, { nama: wilayah.nama });
    return NextResponse.json(wilayah);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate wilayah" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    await prisma.wilayah.delete({ where: { id } });
    await logAudit("delete", "Wilayah", id, { id }, undefined);
    return NextResponse.json({ message: "Wilayah berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus wilayah" }, { status: 500 });
  }
}
