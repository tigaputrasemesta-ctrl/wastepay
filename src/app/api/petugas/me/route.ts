import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Profil petugas dari akun yang sedang login.
 * GET /api/petugas/me → { id, nama, jabatan, wilayahId, lokasiTerakhir? }
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const profil = await prisma.petugas.findUnique({
      where: { userId: session.id },
      select: {
        id: true,
        nama: true,
        jabatan: true,
        wilayahId: true,
        aktif: true,
        lokasi: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            latitude: true,
            longitude: true,
            akurasi: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profil) {
      return NextResponse.json(
        { error: "Akun ini belum ter-link ke profil petugas — hubungi admin" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: profil.id,
      nama: profil.nama,
      jabatan: profil.jabatan,
      wilayahId: profil.wilayahId,
      aktif: profil.aktif,
      lokasiTerakhir: profil.lokasi[0] ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Gagal mengambil profil" }, { status: 500 });
  }
}
