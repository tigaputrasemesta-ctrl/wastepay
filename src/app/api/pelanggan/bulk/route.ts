import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Unauthorized — Khusus admin" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ids, action, value } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "Pilih setidaknya satu warga" }, { status: 400 });
    }

    if (action === "status") {
      const allowedStatus = ["aktif", "calon", "nonaktif", "libur"];
      if (!allowedStatus.includes(value)) {
        return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
      }

      const result = await prisma.pelanggan.updateMany({
        where: {
          id: { in: ids },
          deletedAt: null,
        },
        data: {
          status: value,
        },
      });

      await logAudit("update", "PelangganBulkStatus", "bulk", null, {
        ids,
        newStatus: value,
        affectedRows: result.count,
        adminId: user.id,
      });

      return NextResponse.json({
        success: true,
        affected: result.count,
        message: `Berhasil mengubah status ${result.count} warga menjadi ${value.toUpperCase()}`,
      });
    }

    if (action === "zona") {
      const zonaId = parseInt(value);
      if (isNaN(zonaId)) {
        return NextResponse.json({ error: "Zona tidak valid" }, { status: 400 });
      }

      // Find or create default wilayah for this zona
      let wilayah = await prisma.wilayah.findFirst({
        where: { zonaId },
      });

      if (!wilayah) {
        const zona = await prisma.zona.findUnique({ where: { id: zonaId } });
        if (!zona) {
          return NextResponse.json({ error: "Zona tidak ditemukan" }, { status: 404 });
        }
        wilayah = await prisma.wilayah.create({
          data: {
            nama: `Wilayah ${zona.nama}`,
            zonaId: zona.id,
            kelurahanId: zona.kelurahanId,
          },
        });
      }

      const result = await prisma.pelanggan.updateMany({
        where: {
          id: { in: ids },
          deletedAt: null,
        },
        data: {
          wilayahId: wilayah.id,
        },
      });

      await logAudit("update", "PelangganBulkZona", "bulk", null, {
        ids,
        newZonaId: zonaId,
        newWilayahId: wilayah.id,
        affectedRows: result.count,
        adminId: user.id,
      });

      return NextResponse.json({
        success: true,
        affected: result.count,
        message: `Berhasil memindahkan ${result.count} warga ke zona baru`,
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
  } catch (err: any) {
    console.error("Gagal bulk action pelanggan:", err);
    return NextResponse.json({ error: "Gagal memproses aksi massal", detail: err?.message }, { status: 500 });
  }
}
