import { NextResponse } from "next/server";
import {
  getCoverageData,
  checkCoverageLocation,
} from "@/lib/server/coverage-service";

export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/**
 * GET /api/publik/coverage
 *
 * Public endpoint untuk data peta jangkauan gaya Starlink (starlink.com/map).
 * - Tanpa query param: Mengembalikan data peta agregasi lengkap (statistik, kelurahan, blok operasional, poligon kecamatan).
 * - Dengan ?lat=...&lng=... : Cek real-time apakah koordinat terlayani aktif / perluasan / luar jangkauan + estimasi jadwal dan CTA registrasi.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };

  // Mode 1: Cek titik lokasi tertentu (GPS / Pin / Alamat)
  if (latStr && lngStr) {
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "Parameter koordinat lat & lng tidak valid" },
        { status: 400, headers }
      );
    }

    const result = checkCoverageLocation(lat, lng);
    return NextResponse.json(result, { headers });
  }

  // Mode 2: Data agregasi lengkap untuk inisialisasi Peta Starlink
  try {
    const data = await getCoverageData();
    return NextResponse.json(data, { headers });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gagal memuat data jangkauan", details: error?.message },
      { status: 500, headers }
    );
  }
}
