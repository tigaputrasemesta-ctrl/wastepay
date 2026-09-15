import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const kelurahan = await prisma.kelurahan.findUnique({
      where: { id },
      include: {
        zona: {
          where: { deletedAt: null },
          include: {
            wilayah: true,
            _count: { select: { wilayah: true, petugas: true } },
          },
        },
        wilayah: true,
        _count: { select: { pelanggan: true, petugas: true, zona: true, wilayah: true } },
      },
    });

    if (!kelurahan) {
      return NextResponse.json({ error: "Kelurahan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(kelurahan);
  } catch {
    return NextResponse.json({ error: "Gagal mengambil data kelurahan" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { nama, kode, kecamatan, kota } = body;

    const data: Record<string, unknown> = {};
    if (nama !== undefined) {
      const trimmedNama = nama.trim();
      if (!trimmedNama) {
        return NextResponse.json({ error: "Nama kelurahan tidak boleh kosong" }, { status: 400 });
      }
      // Cek apakah nama baru bentrok dengan kelurahan lain
      const existing = await prisma.kelurahan.findFirst({
        where: {
          id: { not: id },
          nama: { equals: trimmedNama, mode: "insensitive" },
        },
      });
      if (existing) {
        return NextResponse.json({ error: "Nama kelurahan sudah digunakan" }, { status: 400 });
      }
      data.nama = trimmedNama;
    }

    if (kode !== undefined) {
      data.kode = kode ? kode.trim().toUpperCase() : null;
    }
    if (kecamatan !== undefined) {
      data.kecamatan = kecamatan ? kecamatan.trim() : null;
    }
    if (kota !== undefined) {
      data.kota = kota ? kota.trim() : null;
    }

    const updated = await prisma.kelurahan.update({
      where: { id },
      data,
    });

    await logAudit("update", "Kelurahan", id, { id }, data);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal mengupdate kelurahan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);

    const kelurahan = await prisma.kelurahan.findUnique({
      where: { id },
      include: {
        _count: { select: { pelanggan: true, petugas: true, zona: true, wilayah: true } },
      },
    });

    if (!kelurahan) {
      return NextResponse.json({ error: "Kelurahan tidak ditemukan" }, { status: 404 });
    }

    if (kelurahan._count.pelanggan > 0) {
      return NextResponse.json(
        { error: `Tidak dapat menghapus kelurahan: Masih ada ${kelurahan._count.pelanggan} pelanggan terdaftar di kelurahan ini.` },
        { status: 400 }
      );
    }

    if (kelurahan._count.zona > 0) {
      return NextResponse.json(
        { error: `Tidak dapat menghapus kelurahan: Masih ada ${kelurahan._count.zona} zona aktif. Hapus atau pindahkan zona terlebih dahulu.` },
        { status: 400 }
      );
    }

    await prisma.kelurahan.delete({ where: { id } });
    await logAudit("delete", "Kelurahan", id, { id, nama: kelurahan.nama }, undefined);

    return NextResponse.json({ message: "Kelurahan berhasil dihapus" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menghapus kelurahan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
