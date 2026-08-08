import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { judul, isi, penting, untukWilayahId } = body;

    const data: Record<string, unknown> = {};
    if (judul !== undefined) data.judul = judul;
    if (isi !== undefined) data.isi = isi;
    if (penting !== undefined) data.penting = penting;
    if (untukWilayahId !== undefined) {
      data.untukWilayahId = untukWilayahId ? parseInt(untukWilayahId) : null;
    }

    const pengumuman = await prisma.pengumuman.update({
      where: { id },
      data,
      include: {
        createdBy: { select: { id: true, nama: true } },
        untukWilayah: { select: { id: true, nama: true } },
      },
    });

    await logAudit("update", "Pengumuman", id, { id }, { judul: pengumuman.judul });
    return NextResponse.json(pengumuman);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate pengumuman" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    await prisma.pengumuman.delete({ where: { id } });
    await logAudit("delete", "Pengumuman", id, { id }, undefined);
    return NextResponse.json({ message: "Pengumuman berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus pengumuman" }, { status: 500 });
  }
}
