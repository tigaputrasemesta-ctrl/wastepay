import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/petugas/referral
 * Mengambil ringkasan referral khusus untuk petugas yang sedang login.
 * Mengembalikan tautan referral unik, statistik pelanggan yang terdaftar lewat referral,
 * serta daftar pelanggan terbaru yang diajak.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryNama = searchParams.get("nama");

    // Jika admin/superadmin meminta nama tertentu, perbolehkan query
    const targetNama = (session.role === "superadmin" || session.role === "admin") && queryNama
      ? queryNama.trim()
      : session.nama.trim();

    if (!targetNama) {
      return NextResponse.json({ error: "Nama petugas tidak valid" }, { status: 400 });
    }

    // Ambil base URL aplikasi
    const host = request.headers.get("host") || "o2whero.com";
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${proto}://${host}`;
    const referralUrl = `${baseUrl}/daftar?ref=${encodeURIComponent(targetNama)}`;

    // Cari pelanggan dengan referal cocok (case-insensitive)
    const [totalSemua, totalAktif, totalCalon, daftarTerbaru] = await Promise.all([
      prisma.pelanggan.count({
        where: {
          referal: { equals: targetNama, mode: "insensitive" },
        },
      }),
      prisma.pelanggan.count({
        where: {
          referal: { equals: targetNama, mode: "insensitive" },
          status: "aktif",
        },
      }),
      prisma.pelanggan.count({
        where: {
          referal: { equals: targetNama, mode: "insensitive" },
          status: "calon",
        },
      }),
      prisma.pelanggan.findMany({
        where: {
          referal: { equals: targetNama, mode: "insensitive" },
        },
        select: {
          id: true,
          nama: true,
          noTelepon: true,
          alamat: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      nama: targetNama,
      referralUrl,
      stats: {
        totalSemua,
        totalAktif,
        totalCalon,
      },
      daftarTerbaru,
    });
  } catch (error) {
    console.error("Error fetching petugas referral:", error);
    return NextResponse.json({ error: "Gagal mengambil data referral" }, { status: 500 });
  }
}
