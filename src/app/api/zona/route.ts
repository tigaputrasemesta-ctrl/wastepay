import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

/**
 * Zona area pengambilan sampah di dalam satu kelurahan.
 * - GET  /api/zona?kelurahanId=X → daftar zona (+ kelurahan, wilayah RT, & petugas angkut)
 * - POST → buat zona custom (nama, keterangan, warna, kelurahanId, petugasIds, wilayahIds)
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
      _count: { select: { wilayah: true, petugas: true } },
    },
    orderBy: [{ kelurahan: { nama: "asc" } }, { nama: "asc" }],
  });

  return NextResponse.json(zona);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, keterangan, warna, kelurahanId, petugasIds, wilayahIds } = body;

    if (!nama || !kelurahanId) {
      return NextResponse.json(
        { error: "Nama zona dan kelurahan wajib diisi" },
        { status: 400 }
      );
    }

    const zona = await prisma.$transaction(async (tx) => {
      const created = await tx.zona.create({
        data: {
          nama: nama.trim(),
          keterangan: keterangan?.trim() || null,
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
      if (Array.isArray(wilayahIds) && wilayahIds.length > 0) {
        await tx.wilayah.updateMany({
          where: { id: { in: wilayahIds.map(Number) } },
          data: { zonaId: created.id },
        });
      }
      return created;
    });

    await logAudit("create", "Zona", zona.id, undefined, { nama: zona.nama, kelurahanId: zona.kelurahanId });
    return NextResponse.json(zona, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Gagal menambah zona";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
