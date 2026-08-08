import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const petugas = await prisma.petugas.findUnique({
      where: { id },
      include: {
        wilayah: true,
        rute: { include: { wilayah: true } },
      },
    });
    if (!petugas) {
      return NextResponse.json({ error: "Petugas tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(petugas);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data petugas" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { nama, noTelepon, email, foto, aktif, wilayahId, jabatan, userId } = body;

    const data: Record<string, unknown> = {};
    if (nama !== undefined) data.nama = nama;
    if (noTelepon !== undefined) data.noTelepon = noTelepon;
    if (email !== undefined) data.email = email;
    if (foto !== undefined) data.foto = foto;
    if (aktif !== undefined) data.aktif = aktif;
    if (jabatan !== undefined) data.jabatan = jabatan || null;
    if (userId !== undefined) data.userId = userId ? parseInt(userId) : null;
    if (wilayahId !== undefined) data.wilayahId = parseInt(wilayahId);

    const petugas = await prisma.petugas.update({
      where: { id },
      data,
      include: { wilayah: true },
    });

    await logAudit("update", "Petugas", id, { id }, { nama: petugas.nama, aktif: petugas.aktif });
    return NextResponse.json(petugas);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate petugas" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    // Soft delete — pertahankan riwayat pengangkutan & rute
    await prisma.petugas.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await logAudit("delete", "Petugas", id, { id }, undefined);
    return NextResponse.json({ message: "Petugas berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus petugas" }, { status: 500 });
  }
}
