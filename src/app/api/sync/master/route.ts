import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync/master
 * Menghasilkan snapshot data master lengkap TERISOLASI PER TENANT untuk diunduh dan disimpan
 * di IndexedDB perangkat Admin/Petugas (Offline-First Local Storage).
 * Memastikan data warga, rute, dan zona tenant lain tidak bocor.
 */
export async function GET(request: Request) {
  try {
    const tenantResult = await requireTenantContext(request, "petugas");
    if (!tenantResult.success) {
      return tenantResult.response;
    }
    const { context, db } = tenantResult;
    const tenantId = context.tenantId;

    const serverTime = new Date().toISOString();

    const [
      pelangganList,
      wilayahList,
      zonaList,
      kelurahanList,
      paketList,
      ruteList,
    ] = await Promise.all([
      db.pelanggan.findMany({
        where: { deletedAt: null, tenantId },
        select: {
          id: true,
          kodePelanggan: true,
          nama: true,
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
          penanggungjawab: true,
          referal: true,
          customTarif: true,
          status: true,
          catatan: true,
          wilayahId: true,
          kelurahanId: true,
          paketId: true,
          updatedAt: true,
          createdAt: true,
          wilayah: {
            select: {
              id: true,
              nama: true,
              zonaId: true,
              zona: { select: { id: true, nama: true, warna: true } },
            },
          },
          kelurahan: {
            select: { id: true, nama: true },
          },
          paket: {
            select: { id: true, nama: true, harga: true },
          },
        },
        orderBy: { id: "asc" },
      }),
      db.wilayah.findMany({
        where: { tenantId },
        select: {
          id: true,
          nama: true,
          kode: true,
          kelurahanId: true,
          zonaId: true,
          updatedAt: true,
        },
        orderBy: { id: "asc" },
      }),
      db.zona.findMany({
        where: { tenantId },
        select: {
          id: true,
          nama: true,
          warna: true,
          kelurahanId: true,
          updatedAt: true,
        },
        orderBy: { id: "asc" },
      }),
      db.kelurahan.findMany({
        select: {
          id: true,
          nama: true,
          kecamatan: true,
          updatedAt: true,
        },
        orderBy: { id: "asc" },
      }),
      db.paket.findMany({
        where: { tenantId },
        select: {
          id: true,
          nama: true,
          harga: true,
          deskripsi: true,
          updatedAt: true,
        },
        orderBy: { id: "asc" },
      }),
      db.rute.findMany({
        where: { aktif: true, tenantId },
        select: {
          id: true,
          nama: true,
          hari: true,
          jam: true,
          aktif: true,
          petugasId: true,
          petugas: { select: { id: true, nama: true, noTelepon: true } },
          kendaraanId: true,
          kendaraan: { select: { id: true, platNomor: true, nama: true, jenis: true } },
          zonas: { select: { id: true, nama: true, warna: true } },
          updatedAt: true,
        },
        orderBy: { id: "asc" },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      serverTime,
      version: 1,
      tenantId,
      tenantSlug: context.tenantSlug,
      stats: {
        pelanggan: pelangganList.length,
        wilayah: wilayahList.length,
        zona: zonaList.length,
        kelurahan: kelurahanList.length,
        paket: paketList.length,
        rute: ruteList.length,
      },
      data: {
        pelanggan: pelangganList.map((p) => ({
          ...p,
          fotoRumah: p.fotoRumah
            ? p.fotoRumah.startsWith("http")
              ? p.fotoRumah
              : `/api/pelanggan/${p.id}/foto`
            : null,
        })),
        wilayah: wilayahList,
        zona: zonaList,
        kelurahan: kelurahanList,
        paket: paketList,
        rute: ruteList,
      },
    });
  } catch (error) {
    console.error("[API Sync Master] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal mengunduh data master" },
      { status: 500 }
    );
  }
}
