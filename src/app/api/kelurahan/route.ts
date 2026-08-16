import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Daftar kelurahan (untuk dropdown scope petugas & referensi wilayah).
 * GET /api/kelurahan
 */
export async function GET() {
  const kelurahan = await prisma.kelurahan.findMany({
    select: {
      id: true,
      nama: true,
      kecamatan: true,
      kota: true,
      _count: { select: { wilayah: true, petugas: true } },
    },
    orderBy: [{ kecamatan: "asc" }, { nama: "asc" }],
  });
  return NextResponse.json(kelurahan);
}
