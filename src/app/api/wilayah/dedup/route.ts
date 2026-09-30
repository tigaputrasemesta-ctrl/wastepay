import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireRole } from "@/lib/server-rbac";

export const dynamic = "force-dynamic";

/**
 * Helper to normalize block names for deduplication:
 * strips extra whitespace and converts to lower case
 */
function normalizeName(nama: string): string {
  return nama.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * GET /api/wilayah/dedup
 * Inspects all Wilayah records and previews duplicate groups without modifying data.
 */
export async function GET(request: Request) {
  try {
    const auth = await requireRole(request, "admin");
    if (auth instanceof NextResponse) return auth;

    const allWilayah = await prisma.wilayah.findMany({
      include: {
        kelurahanRef: {
          select: { id: true, nama: true, kecamatan: true, kota: true },
        },
        _count: {
          select: {
            pelanggan: true,
            petugas: true,
            rute: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    // Group by key: `${kelurahanId}:::${normalizedName}`
    const groups = new Map<string, typeof allWilayah>();

    for (const w of allWilayah) {
      const key = `${w.kelurahanId ?? 0}:::${normalizeName(w.nama)}`;
      const list = groups.get(key) || [];
      list.push(w);
      groups.set(key, list);
    }

    type DuplicateGroupPreview = {
      canonicalId: number;
      nama: string;
      kelurahan: string | null;
      kecamatan: string | null;
      totalRecords: number;
      duplicateCount: number;
      canonicalPelanggan: number;
      duplicatePelangganTotal: number;
      duplicateIds: number[];
    };
    const duplicateGroups: DuplicateGroupPreview[] = [];
    let totalDuplicatesToDelete = 0;

    for (const [, members] of groups.entries()) {
      if (members.length > 1) {
        // Sort: most customers first, then most officers, then lowest ID (oldest)
        const sorted = [...members].sort((a, b) => {
          if (b._count.pelanggan !== a._count.pelanggan) {
            return b._count.pelanggan - a._count.pelanggan;
          }
          if (b._count.petugas !== a._count.petugas) {
            return b._count.petugas - a._count.petugas;
          }
          if (b._count.rute !== a._count.rute) {
            return b._count.rute - a._count.rute;
          }
          return a.id - b.id;
        });

        const canonical = sorted[0];
        const duplicates = sorted.slice(1);
        totalDuplicatesToDelete += duplicates.length;

        duplicateGroups.push({
          canonicalId: canonical.id,
          nama: canonical.nama,
          kelurahan: canonical.kelurahanRef?.nama || canonical.kelurahan || null,
          kecamatan: canonical.kelurahanRef?.kecamatan || canonical.kecamatan || null,
          totalRecords: members.length,
          duplicateCount: duplicates.length,
          canonicalPelanggan: canonical._count.pelanggan,
          duplicatePelangganTotal: duplicates.reduce((acc, d) => acc + d._count.pelanggan, 0),
          duplicateIds: duplicates.map((d) => d.id),
        });
      }
    }

    return NextResponse.json({
      totalWilayah: allWilayah.length,
      duplicateGroupsCount: duplicateGroups.length,
      totalDuplicatesToDelete,
      duplicateGroups,
    });
  } catch (error) {
    console.error("Error inspecting wilayah duplicates:", error);
    return NextResponse.json(
      { error: "Gagal menganalisa duplikat wilayah" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/wilayah/dedup
 * Safely merges duplicate Wilayah records into a canonical record and deletes redundant entries.
 * Re-points Pelanggan, Petugas, Rute, and Pengumuman foreign keys to canonical ID.
 */
export async function POST(request: Request) {
  try {
    const auth = await requireRole(request, "admin");
    if (auth instanceof NextResponse) return auth;

    const allWilayah = await prisma.wilayah.findMany({
      include: {
        kelurahanRef: {
          select: { id: true, nama: true, kecamatan: true },
        },
        _count: {
          select: {
            pelanggan: true,
            petugas: true,
            rute: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });

    const groups = new Map<string, typeof allWilayah>();

    for (const w of allWilayah) {
      const key = `${w.kelurahanId ?? 0}:::${normalizeName(w.nama)}`;
      const list = groups.get(key) || [];
      list.push(w);
      groups.set(key, list);
    }

    let mergedGroupsCount = 0;
    let deletedWilayahCount = 0;
    let movedPelangganCount = 0;
    let movedPetugasCount = 0;
    let movedRuteCount = 0;
    let movedPengumumanCount = 0;

    const mergeDetails: {
      canonicalId: number;
      nama: string;
      kelurahan: string | null;
      deletedIds: number[];
      pelangganMoved: number;
    }[] = [];

    for (const [, members] of groups.entries()) {
      if (members.length <= 1) continue;

      // Sort: canonical is first
      const sorted = [...members].sort((a, b) => {
        if (b._count.pelanggan !== a._count.pelanggan) {
          return b._count.pelanggan - a._count.pelanggan;
        }
        if (b._count.petugas !== a._count.petugas) {
          return b._count.petugas - a._count.petugas;
        }
        if (b._count.rute !== a._count.rute) {
          return b._count.rute - a._count.rute;
        }
        return a.id - b.id;
      });

      const canonical = sorted[0];
      const duplicates = sorted.slice(1);
      const duplicateIds = duplicates.map((d) => d.id);

      // Re-point foreign keys
      const pRes = await prisma.pelanggan.updateMany({
        where: { wilayahId: { in: duplicateIds } },
        data: { wilayahId: canonical.id },
      });
      movedPelangganCount += pRes.count;

      const ptRes = await prisma.petugas.updateMany({
        where: { wilayahId: { in: duplicateIds } },
        data: { wilayahId: canonical.id },
      });
      movedPetugasCount += ptRes.count;

      const rRes = await prisma.rute.updateMany({
        where: { wilayahId: { in: duplicateIds } },
        data: { wilayahId: canonical.id },
      });
      movedRuteCount += rRes.count;

      const pgRes = await prisma.pengumuman.updateMany({
        where: { untukWilayahId: { in: duplicateIds } },
        data: { untukWilayahId: canonical.id },
      });
      movedPengumumanCount += pgRes.count;

      // Delete the duplicate records
      const delRes = await prisma.wilayah.deleteMany({
        where: { id: { in: duplicateIds } },
      });
      deletedWilayahCount += delRes.count;
      mergedGroupsCount += 1;

      mergeDetails.push({
        canonicalId: canonical.id,
        nama: canonical.nama,
        kelurahan: canonical.kelurahanRef?.nama || canonical.kelurahan || null,
        deletedIds: duplicateIds,
        pelangganMoved: pRes.count,
      });
    }

    if (mergedGroupsCount > 0) {
      await logAudit("update", "Wilayah", 0, undefined, {
        action: "deduplicate_wilayah",
        mergedGroupsCount,
        deletedWilayahCount,
        movedPelangganCount,
        mergeDetails,
      });
    }

    return NextResponse.json({
      success: true,
      mergedGroups: mergedGroupsCount,
      deletedCount: deletedWilayahCount,
      updatedPelanggan: movedPelangganCount,
      updatedPetugas: movedPetugasCount,
      updatedRute: movedRuteCount,
      updatedPengumuman: movedPengumumanCount,
      details: mergeDetails,
      message:
        mergedGroupsCount > 0
          ? `Berhasil menggabungkan ${mergedGroupsCount} grup blok pickup duplikat dan menghapus ${deletedWilayahCount} data duplikat.`
          : "Tidak ditemukan data blok pickup duplikat.",
    });
  } catch (error) {
    console.error("Error executing wilayah deduplication:", error);
    return NextResponse.json(
      { error: "Gagal menggabungkan data duplikat wilayah" },
      { status: 500 }
    );
  }
}
