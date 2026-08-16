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
        kelurahan: true,
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
    const { nama, noTelepon, email, foto, aktif, kelurahanId, jabatan, userId } = body;

    const data: Record<string, unknown> = {};
    if (nama !== undefined) data.nama = nama;
    if (noTelepon !== undefined) data.noTelepon = noTelepon;
    if (email !== undefined) data.email = email;
    if (foto !== undefined) data.foto = foto;
    if (aktif !== undefined) data.aktif = aktif;
    if (jabatan !== undefined) data.jabatan = Array.isArray(jabatan) ? jabatan.join(",") : (jabatan || null);
    if (userId !== undefined) data.userId = userId ? parseInt(userId) : null;
    if (kelurahanId !== undefined) {
      data.kelurahanId = kelurahanId ? parseInt(kelurahanId) : null;
      // wilayahId sudah tidak dipakai — scope petugas murni via kelurahan
      data.wilayahId = null;
    }

    const petugas = await prisma.petugas.update({
      where: { id },
      data,
      include: { wilayah: true, kelurahan: true },
    });

    await logAudit("update", "Petugas", id, { id }, { nama: petugas.nama, aktif: petugas.aktif });
    return NextResponse.json(petugas);
  } catch (error) {
    // Prisma error P2002 = unique constraint violation (akun login sudah ter-link)
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ error: "Akun login (User) tersebut sudah terhubung dengan petugas lain!" }, { status: 400 });
    }
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
