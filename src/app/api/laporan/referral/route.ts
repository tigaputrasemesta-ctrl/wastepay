import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/laporan/referral
 * Laporan rekapitulasi performa referral per petugas / pereferensi.
 * Hanya dapat diakses oleh Superadmin, Admin, dan Kasir.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "superadmin" && session.role !== "admin" && session.role !== "kasir")) {
      return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    // Ambil semua petugas terdaftar beserta user akunnya
    const petugasList = await prisma.petugas.findMany({
      include: {
        user: { select: { nama: true, email: true, role: true } },
        kelurahan: { select: { nama: true } },
      },
    });

    // Ambil semua pelanggan yang memiliki nilai referal
    const pelangganWithReferal = await prisma.pelanggan.findMany({
      where: {
        referal: { not: null },
      },
      select: {
        id: true,
        nama: true,
        referal: true,
        status: true,
        createdAt: true,
      },
    });

    // Petugas Map: nama lowercase -> info petugas
    const petugasMap = new Map<string, { id: number; nama: string; jabatan: string | null; kelurahan: string | null }>();
    for (const p of petugasList) {
      const nama = p.user?.nama || p.nama;
      if (nama) {
        petugasMap.set(nama.toLowerCase().trim(), {
          id: p.id,
          nama,
          jabatan: p.jabatan,
          kelurahan: p.kelurahan?.nama ?? null,
        });
      }
    }

    // Agregasi per nama referral
    const referralMap = new Map<
      string,
      {
        namaReferal: string;
        isOfficialPetugas: boolean;
        petugasId: number | null;
        jabatan: string | null;
        kelurahan: string | null;
        total: number;
        aktif: number;
        calon: number;
        lainnya: number;
      }
    >();

    for (const p of pelangganWithReferal) {
      const rawRef = (p.referal || "").trim();
      if (!rawRef) continue;

      const key = rawRef.toLowerCase();
      let item = referralMap.get(key);
      if (!item) {
        const petugasInfo = petugasMap.get(key);
        item = {
          namaReferal: petugasInfo ? petugasInfo.nama : rawRef,
          isOfficialPetugas: Boolean(petugasInfo),
          petugasId: petugasInfo?.id ?? null,
          jabatan: petugasInfo?.jabatan ?? null,
          kelurahan: petugasInfo?.kelurahan ?? null,
          total: 0,
          aktif: 0,
          calon: 0,
          lainnya: 0,
        };
        referralMap.set(key, item);
      }

      item.total += 1;
      if (p.status === "aktif") {
        item.aktif += 1;
      } else if (p.status === "calon") {
        item.calon += 1;
      } else {
        item.lainnya += 1;
      }
    }

    // Masukkan petugas yang belum memiliki referral (total 0) agar admin bisa melihat seluruh armada
    for (const [key, p] of petugasMap.entries()) {
      if (!referralMap.has(key)) {
        referralMap.set(key, {
          namaReferal: p.nama,
          isOfficialPetugas: true,
          petugasId: p.id,
          jabatan: p.jabatan,
          kelurahan: p.kelurahan,
          total: 0,
          aktif: 0,
          calon: 0,
          lainnya: 0,
        });
      }
    }

    const rows = Array.from(referralMap.values()).sort((a, b) => b.total - a.total);

    const summary = {
      totalPelangganReferral: pelangganWithReferal.length,
      totalAktif: pelangganWithReferal.filter((p) => p.status === "aktif").length,
      totalCalon: pelangganWithReferal.filter((p) => p.status === "calon").length,
      totalPetugasAktif: petugasList.filter((p) => p.aktif).length,
    };

    return NextResponse.json({
      summary,
      rows,
    });
  } catch (error) {
    console.error("Error generating referral report:", error);
    return NextResponse.json({ error: "Gagal membuat laporan referral" }, { status: 500 });
  }
}
