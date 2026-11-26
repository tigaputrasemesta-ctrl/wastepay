import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tvTokenValid } from "@/lib/tv-token";
import { resolveTenantByHost, buildTenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * GET /api/publik/tv-peta
 *
 * Endpoint read-only khusus layar TV / wallboard. Mengembalikan data realtime
 * (lokasi petugas, kendaraan, titik transit, dan pengaduan) dalam SATU
 * permintaan supaya polling di layar besar lebih hemat.
 *
 * Keamanan: tidak memakai sesi cookie, melainkan header
 * `x-tv-token` yang diverifikasi constant-time. Data yang dikembalikan adalah
 * scope tenant aktif sesuai host domain permintaan.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("t") || searchParams.get("token") || request.headers.get("x-tv-token");

  if (!tvTokenValid(token)) {
    return NextResponse.json({ error: "Akses ditolak" }, { status: 401 });
  }

  try {
    const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const tenantCtx = resolveTenantByHost(rawHost);
    const tenantFilter = buildTenantFilter(tenantCtx.tenant.id, tenantCtx.isPilot);

    const [petugasRaw, kendaraanRaw, transit, komplain] = await Promise.all([
      // Lokasi terakhir semua petugas aktif dalam tenant
      prisma.lokasiPetugas.findMany({
        where: {
          ...tenantFilter,
          petugas: { ...tenantFilter, aktif: true },
        },
        select: {
          latitude: true,
          longitude: true,
          akurasi: true,
          sumber: true,
          createdAt: true,
          petugas: { select: { id: true, nama: true, jabatan: true, aktif: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Lokasi terakhir semua kendaraan aktif dalam tenant
      prisma.lokasiKendaraan.findMany({
        where: {
          ...tenantFilter,
          kendaraan: { ...tenantFilter, aktif: true },
        },
        select: {
          latitude: true,
          longitude: true,
          akurasi: true,
          createdAt: true,
          kendaraan: {
            select: {
              id: true,
              nama: true,
              platNomor: true,
              jenis: true,
              aktif: true,
              petugas: { select: { nama: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Titik transit / lapak dalam tenant
      prisma.titikTransit.findMany({
        where: tenantFilter,
        select: { id: true, nama: true, alamat: true, latitude: true, longitude: true, aktif: true, catatan: true },
        orderBy: { nama: "asc" },
      }),
      // Pengaduan terbaru dalam tenant
      prisma.komplain.findMany({
        where: {
          ...tenantFilter,
          pelanggan: { ...tenantFilter },
        },
        include: {
          pelanggan: {
            select: {
              id: true,
              nama: true,
              alamat: true,
              noTelepon: true,
              kodePelanggan: true,
              latitude: true,
              longitude: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 300,
      }),
    ]);

    // 1 titik terakhir per petugas aktif
    const petugasTerakhir = new Map<number, (typeof petugasRaw)[number]>();
    for (const t of petugasRaw) {
      if (t.petugas.aktif && !petugasTerakhir.has(t.petugas.id)) {
        petugasTerakhir.set(t.petugas.id, t);
      }
    }
    const petugas = [...petugasTerakhir.values()].map((t) => ({
      petugasId: t.petugas.id,
      nama: t.petugas.nama,
      jabatan: t.petugas.jabatan,
      latitude: t.latitude,
      longitude: t.longitude,
      akurasi: t.akurasi,
      sumber: t.sumber,
      updatedAt: t.createdAt.toISOString(),
    }));

    // 1 titik terakhir per kendaraan aktif
    const kendaraanTerakhir = new Map<number, (typeof kendaraanRaw)[number]>();
    for (const t of kendaraanRaw) {
      if (t.kendaraan.aktif && !kendaraanTerakhir.has(t.kendaraan.id)) {
        kendaraanTerakhir.set(t.kendaraan.id, t);
      }
    }
    const kendaraan = [...kendaraanTerakhir.values()].map((t) => ({
      kendaraanId: t.kendaraan.id,
      nama: t.kendaraan.nama,
      platNomor: t.kendaraan.platNomor,
      jenis: t.kendaraan.jenis,
      pengemudi: t.kendaraan.petugas?.nama ?? null,
      latitude: t.latitude,
      longitude: t.longitude,
      akurasi: t.akurasi,
      updatedAt: t.createdAt.toISOString(),
    }));

    return NextResponse.json(
      { petugas, kendaraan, transit, komplain },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json({ error: "Gagal memuat data peta" }, { status: 500 });
  }
}
