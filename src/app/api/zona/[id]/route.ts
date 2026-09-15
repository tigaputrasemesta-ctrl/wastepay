import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const zona = await prisma.zona.findUnique({
      where: { id },
      include: {
        kelurahan: { select: { id: true, nama: true, kecamatan: true, kode: true } },
        wilayah: {
          select: { id: true, nama: true, rt: true, rw: true },
          orderBy: { nama: "asc" },
        },
        petugas: {
          include: {
            petugas: { select: { id: true, nama: true, jabatan: true } },
          },
        },
      },
    });
    if (!zona) {
      return NextResponse.json({ error: "Zona tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(zona);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data zona" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.nama !== undefined) data.nama = body.nama.trim();
    if (body.keterangan !== undefined) data.keterangan = body.keterangan?.trim() || null;
    if (body.warna !== undefined) data.warna = body.warna || null;
    if (body.kelurahanId !== undefined) data.kelurahanId = parseInt(body.kelurahanId);

    const zona = await prisma.$transaction(async (tx) => {
      const updated = await tx.zona.update({ where: { id }, data });

      // Ganti penugasan petugas angkut (replace all) bila petugasIds dikirim
      if (Array.isArray(body.petugasIds)) {
        await tx.zonaPetugas.deleteMany({ where: { zonaId: id } });
        if (body.petugasIds.length > 0) {
          await tx.zonaPetugas.createMany({
            data: body.petugasIds.map((pid: unknown) => ({
              zonaId: id,
              petugasId: parseInt(String(pid)),
            })),
            skipDuplicates: true,
          });
        }
      }

      // Ganti relasi wilayah/RT bila wilayahIds dikirim
      if (Array.isArray(body.wilayahIds)) {
        // Lepas RT lama dari zona ini
        await tx.wilayah.updateMany({
          where: { zonaId: id },
          data: { zonaId: null },
        });
        // Hubungkan RT baru yang dipilih
        if (body.wilayahIds.length > 0) {
          await tx.wilayah.updateMany({
            where: { id: { in: body.wilayahIds.map(Number) } },
            data: { zonaId: id },
          });
        }
      }

      return updated;
    });

    await logAudit("update", "Zona", id, { id }, { nama: zona.nama, kelurahanId: zona.kelurahanId });
    return NextResponse.json(zona);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengupdate zona";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    await prisma.zona.update({ where: { id }, data: { deletedAt: new Date() } });
    await logAudit("delete", "Zona", id, { id }, undefined);
    return NextResponse.json({ message: "Zona berhasil dihapus" });
  } catch {
    return NextResponse.json({ error: "Gagal menghapus zona" }, { status: 500 });
  }
}
