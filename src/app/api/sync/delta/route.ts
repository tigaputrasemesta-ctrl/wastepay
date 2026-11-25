import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenantContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/**
 * GET /api/sync/delta?since=<ISO_TIMESTAMP>&entities=pelanggan,tagihan,komplain,pengangkutan
 * Mengembalikan HANYA delta data TERISOLASI PER TENANT.
 */
export async function GET(request: Request) {
  try {
    const tenantResult = await requireTenantContext(request, "petugas");
    if (!tenantResult.success) {
      return tenantResult.response;
    }
    const { context, db } = tenantResult;
    const tenantId = context.tenantId;

    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get("since");

    if (!sinceParam) {
      return NextResponse.json(
        { error: "Parameter 'since' wajib diisi (ISO timestamp format)" },
        { status: 400 }
      );
    }

    const sinceDate = new Date(sinceParam);
    if (isNaN(sinceDate.getTime())) {
      return NextResponse.json(
        { error: "Format timestamp 'since' tidak valid" },
        { status: 400 }
      );
    }

    const serverTime = new Date().toISOString();
    const limit = Math.min(500, Math.max(1, parseInt(searchParams.get("limit") || "250")));

    const entitiesParam = searchParams.get("entities") || "pelanggan,tagihan,komplain,pengangkutan,zona,rute";
    const entities = entitiesParam.split(",").map((e) => e.trim().toLowerCase());

    const deltaData: Record<string, unknown[]> = {};
    const deletedItems: { entity: string; id: number }[] = [];
    const deltaCounts: Record<string, number> = {};

    // 1. Delta Pelanggan
    if (entities.includes("pelanggan")) {
      const [updatedPelanggan, deletedPelanggan] = await Promise.all([
        db.pelanggan.findMany({
          where: {
            updatedAt: { gte: sinceDate },
            deletedAt: null,
            tenantId,
          },
          take: limit,
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
          orderBy: { updatedAt: "asc" },
        }),
        db.pelanggan.findMany({
          where: {
            deletedAt: { gte: sinceDate },
            tenantId,
          },
          select: { id: true },
        }),
      ]);

      deltaData.pelanggan = updatedPelanggan.map((p) => ({
        ...p,
        fotoRumah: p.fotoRumah
          ? p.fotoRumah.startsWith("http")
            ? p.fotoRumah
            : `/api/pelanggan/${p.id}/foto`
          : null,
      }));
      for (const d of deletedPelanggan) {
        deletedItems.push({ entity: "pelanggan", id: d.id });
      }
      deltaCounts.pelanggan = updatedPelanggan.length;
    }

    // 2. Delta Tagihan
    if (entities.includes("tagihan")) {
      const updatedTagihan = await db.tagihan.findMany({
        where: {
          updatedAt: { gte: sinceDate },
          deletedAt: null,
          tenantId,
        },
        take: limit,
        select: {
          id: true,
          noInvoice: true,
          bulan: true,
          tahun: true,
          jumlah: true,
          denda: true,
          status: true,
          jatuhTempo: true,
          tanggalLunas: true,
          pelangganId: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "asc" },
      });
      deltaData.tagihan = updatedTagihan;
      deltaCounts.tagihan = updatedTagihan.length;
    }

    // 3. Delta Komplain
    if (entities.includes("komplain")) {
      const updatedKomplain = await db.komplain.findMany({
        where: {
          updatedAt: { gte: sinceDate },
          tenantId,
        },
        take: limit,
        select: {
          id: true,
          jenis: true,
          deskripsi: true,
          foto: true,
          status: true,
          tanggapan: true,
          pelangganId: true,
          updatedAt: true,
          createdAt: true,
        },
        orderBy: { updatedAt: "asc" },
      });
      deltaData.komplain = updatedKomplain;
      deltaCounts.komplain = updatedKomplain.length;
    }

    // 4. Delta Pengangkutan
    if (entities.includes("pengangkutan")) {
      const updatedPengangkutan = await db.pengangkutan.findMany({
        where: {
          updatedAt: { gte: sinceDate },
          deletedAt: null,
          tenantId,
        },
        take: limit,
        select: {
          id: true,
          pelangganId: true,
          petugasId: true,
          kendaraanId: true,
          tanggal: true,
          status: true,
          volume: true,
          latitude: true,
          longitude: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "asc" },
      });
      deltaData.pengangkutan = updatedPengangkutan;
      deltaCounts.pengangkutan = updatedPengangkutan.length;
    }

    return NextResponse.json({
      ok: true,
      serverTime,
      since: sinceParam,
      tenantId,
      deltaCounts,
      data: deltaData,
      deleted: deletedItems,
    });
  } catch (error) {
    console.error("[API Sync Delta] Error:", error);
    return NextResponse.json(
      { ok: false, error: "Gagal memproses sinkronisasi delta" },
      { status: 500 }
    );
  }
}
