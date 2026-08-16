import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { normalisasiKodeWilayah } from "@/lib/kode-pelanggan";
import { upsertKelurahan } from "@/lib/scope";

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
    if (body.zonaId !== undefined) {
      data.zonaId = body.zonaId ? parseInt(body.zonaId) : null;
    }
    // Sinkronkan canonical kelurahanId setiap kali kolom denormalisasi berubah
    if (kelurahan !== undefined || kecamatan !== undefined || kota !== undefined) {
      const namaKel = kelurahan ?? (await prisma.wilayah.findUnique({ where: { id }, select: { kelurahan: true } }))?.kelurahan;
      const kecKel = kecamatan ?? (await prisma.wilayah.findUnique({ where: { id }, select: { kecamatan: true } }))?.kecamatan;
      const kotaKel = kota ?? (await prisma.wilayah.findUnique({ where: { id }, select: { kota: true } }))?.kota;
      data.kelurahanId = await upsertKelurahan(namaKel, kecKel, kotaKel);
    }
    if (body.kode !== undefined) {
      const kode = normalisasiKodeWilayah(body.kode);
      if (!kode) {
        return NextResponse.json({ error: "Kode zona tidak valid" }, { status: 400 });
      }
      data.kode = kode;
    }

    const wilayah = await prisma.wilayah.update({
      where: { id },
      data,
    });

    await logAudit("update", "Wilayah", id, { id }, { nama: wilayah.nama });
    return NextResponse.json(wilayah);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Kode zona sudah dipakai wilayah lain" },
        { status: 400 }
      );
    }
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
