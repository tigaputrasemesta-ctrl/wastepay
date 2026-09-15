import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/**
 * Master Data Kelurahan & Hierarki Zonasi
 * - GET /api/kelurahan:
 *     daftar kelurahan (opsional ?includeDetail=true untuk memuat data zona, wilayah, dan petugas)
 * - POST /api/kelurahan:
 *     tambah kelurahan baru (nama, kode, kecamatan, kota)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeDetail = url.searchParams.get("includeDetail") === "true";
  const kecamatanParam = url.searchParams.get("kecamatan");

  const where: Record<string, unknown> = {};
  if (kecamatanParam) {
    where.kecamatan = kecamatanParam;
  }

  const kelurahan = await prisma.kelurahan.findMany({
    where,
    select: {
      id: true,
      nama: true,
      kode: true,
      kecamatan: true,
      kota: true,
      createdAt: true,
      _count: { select: { wilayah: true, petugas: true, pelanggan: true, zona: true } },
      ...(includeDetail
        ? {
            zona: {
              where: { deletedAt: null },
              select: {
                id: true,
                nama: true,
                keterangan: true,
                warna: true,
                kelurahanId: true,
                _count: { select: { wilayah: true, petugas: true } },
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
              orderBy: { nama: "asc" },
            },
            wilayah: {
              select: { id: true, nama: true, rt: true, rw: true, zonaId: true },
              orderBy: { nama: "asc" },
            },
          }
        : {}),
    },
    orderBy: [{ kecamatan: "asc" }, { nama: "asc" }],
  });

  return NextResponse.json(kelurahan);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, kode, kecamatan, kota } = body;

    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: "Nama kelurahan wajib diisi" }, { status: 400 });
    }

    const trimmedNama = nama.trim();
    const trimmedKode = kode ? kode.trim().toUpperCase() : trimmedNama.substring(0, 3).toUpperCase();
    const trimmedKecamatan = kecamatan ? kecamatan.trim() : null;
    const trimmedKota = kota ? kota.trim() : "Kota Depok";

    // Cek duplikasi nama kelurahan
    const existing = await prisma.kelurahan.findFirst({
      where: { nama: { equals: trimmedNama, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ error: "Kelurahan dengan nama ini sudah terdaftar" }, { status: 400 });
    }

    const kelurahan = await prisma.kelurahan.create({
      data: {
        nama: trimmedNama,
        kode: trimmedKode,
        kecamatan: trimmedKecamatan,
        kota: trimmedKota,
      },
    });

    await logAudit("create", "Kelurahan", kelurahan.id, undefined, {
      nama: kelurahan.nama,
      kecamatan: kelurahan.kecamatan,
      kode: kelurahan.kode,
    });

    return NextResponse.json(kelurahan, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menambah kelurahan";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
