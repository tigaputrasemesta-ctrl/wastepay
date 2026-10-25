import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getPetugasKelurahan, PETUGAS_SCOPE_ALL } from "@/lib/scope";

export const dynamic = "force-dynamic";

/**
 * Daftar calon pelanggan baru untuk survei lapangan.
 * GET /api/survei?kelurahan=...
 */
export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const kelurahanParam = searchParams.get("kelurahan");

    const where: any = {
      status: "calon",
      deletedAt: null,
    };

    if (session.role === "petugas" && !PETUGAS_SCOPE_ALL) {
      const kelurahanId = await getPetugasKelurahan(session.id);
      if (kelurahanId) {
        where.kelurahanId = kelurahanId;
      }
    } else if (kelurahanParam) {
      where.kelurahan = {
        nama: { contains: kelurahanParam, mode: "insensitive" },
      };
    }

    const calon = await prisma.pelanggan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nama: true,
        kodePelanggan: true,
        noTelepon: true,
        kategori: true,
        alamat: true,
        rtRw: true,
        patokanLokasi: true,
        fotoRumah: true,
        latitude: true,
        longitude: true,
        koordinatSumber: true,
        koordinatAkurasi: true,
        status: true,
        createdAt: true,
        kelurahanId: true,
        kelurahan: { select: { id: true, nama: true, kecamatan: true } },
      },
    });

    return NextResponse.json(calon);
  } catch (error) {
    return NextResponse.json({ error: "Gagal memuat calon pelanggan" }, { status: 500 });
  }
}
