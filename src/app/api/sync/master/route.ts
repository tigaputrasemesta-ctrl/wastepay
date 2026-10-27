import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync/master
 * Menghasilkan snapshot data master lengkap untuk diunduh dan disimpan
 * di IndexedDB perangkat Admin (Offline-First Local Storage).
 * Membebaskan server dari query berulang ribuan data saat admin login di HP.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serverTime = new Date().toISOString();

    const [
      pelangganList,
      wilayahList,
      zonaList,
      kelurahanList,
      paketList,
      ruteList,
    ] = await Promise.all([
      prisma.pelanggan.findMany({
        where: { deletedAt: null },
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
      prisma.wilayah.findMany({
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
      prisma.zona.findMany({
        select: {
          id: true,
          nama: true,
          warna: true,
          kelurahanId: true,
          updatedAt: true,
        },
        orderBy: { id: "asc" },
      }),
      prisma.kelurahan.findMany({
        select: {
          id: true,
          nama: true,
          kecamatan: true,
          updatedAt: true,
        },
        orderBy: { id: "asc" },
      }),
      prisma.paket.findMany({
        select: {
          id: true,
          nama: true,
          harga: true,
          deskripsi: true,
          updatedAt: true,
        },
        orderBy: { id: "asc" },
      }),
      prisma.rute.findMany({
        where: { aktif: true },
        select: {
          id: true,
          nama: true,
          hariOperasional: true,
          warna: true,
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
      stats: {
        pelanggan: pelangganList.length,
        wilayah: wilayahList.length,
        zona: zonaList.length,
        kelurahan: kelurahanList.length,
        paket: paketList.length,
        rute: ruteList.length,
      },
      data: {
        pelanggan: pelangganList,
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
