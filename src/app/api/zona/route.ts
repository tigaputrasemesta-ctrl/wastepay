import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/**
 * Zona area pengambilan sampah di dalam satu kelurahan.
 * - GET  /api/zona?kelurahanId=X → daftar zona (+ jumlah RT & petugas angkut)
 * - POST → buat zona custom (nama, keterangan, warna, kelurahanId, petugasIds)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const kelurahanId = url.searchParams.get("kelurahanId");

  const zona = await prisma.zona.findMany({
    where: {
      deletedAt: null,
      ...(kelurahanId ? { kelurahanId: parseInt(kelurahanId) } : {}),
    },
    include: {
      kelurahan: { select: { id: true, nama: true } },
      _count: { select: { wilayah: true, petugas: true } },
    },
    orderBy: [{ kelurahan: { nama: "asc" } }, { nama: "asc" }],
  });

  return NextResponse.json(zona);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, keterangan, warna, kelurahanId, petugasIds } = body;

    if (!nama || !kelurahanId) {
      return NextResponse.json(
        { error: "Nama zona dan kelurahan wajib diisi" },
        { status: 400 }
      );
    }

    const zona = await prisma.$transaction(async (tx) => {
      const created = await tx.zona.create({
        data: {
          nama,
          keterangan: keterangan || null,
          warna: warna || null,
          kelurahanId: parseInt(kelurahanId),
        },
      });
      if (Array.isArray(petugasIds) && petugasIds.length > 0) {
        await tx.zonaPetugas.createMany({
          data: petugasIds.map((pid: unknown) => ({
            zonaId: created.id,
            petugasId: parseInt(String(pid)),
          })),
          skipDuplicates: true,
        });
      }
      return created;
    });

    await logAudit("create", "Zona", zona.id, undefined, { nama: zona.nama, kelurahanId: zona.kelurahanId });
    return NextResponse.json(zona, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Gagal menambah zona" }, { status: 500 });
  }
}
