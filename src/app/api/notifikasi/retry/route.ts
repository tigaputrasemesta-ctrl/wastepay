import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { kirimWhatsApp, isWaEnabled, sleep } from "@/lib/wa";

export const dynamic = "force-dynamic";

/**
 * POST /api/notifikasi/retry
 * Mengirim ulang notifikasi WhatsApp yang sempat gagal.
 * Mendukung pengiriman per-ID ({ id }), kumpulan ID ({ ids: [] }),
 * atau batch gagal ({ retryAllFailed: true, limit: 20 }).
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, ids, retryAllFailed, limit = 20 } = body;

    let targetIds: number[] = [];

    if (id) {
      targetIds = [Number(id)];
    } else if (Array.isArray(ids) && ids.length > 0) {
      targetIds = ids.map(Number).filter((n) => Number.isInteger(n) && n > 0);
    } else if (retryAllFailed) {
      const maxLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
      const failed = await prisma.notifikasi.findMany({
        where: { status: "gagal" },
        select: { id: true },
        orderBy: { createdAt: "desc" },
        take: maxLimit,
      });
      targetIds = failed.map((f) => f.id);
    }

    if (targetIds.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada notifikasi yang dipilih untuk dikirim ulang." },
        { status: 400 }
      );
    }

    const items = await prisma.notifikasi.findMany({
      where: { id: { in: targetIds } },
    });

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Data notifikasi tidak ditemukan di sistem." },
        { status: 404 }
      );
    }

    const gatewayActive = isWaEnabled();
    let successCount = 0;
    let failCount = 0;
    const details: { id: number; ok: boolean; error?: string; waLink?: string }[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Delay anti-spam antar pengiriman (1200ms) jika gateway aktif
      if (i > 0 && gatewayActive) {
        await sleep(1200);
      }

      const cleanPhone = (item.penerima || "").replace(/[^0-9]/g, "");
      const waLink = `https://wa.me/${cleanPhone.replace(/^0/, "62")}?text=${encodeURIComponent(item.pesan || "")}`;

      if (!cleanPhone || !item.pesan) {
        failCount++;
        details.push({ id: item.id, ok: false, error: "Nomor penerima atau format pesan tidak valid" });
        continue;
      }

      if (gatewayActive) {
        const res = await kirimWhatsApp(cleanPhone, item.pesan);
        if (res.ok) {
          await prisma.notifikasi.update({
            where: { id: item.id },
            data: {
              status: "terkirim",
              dikirimPada: new Date(),
              error: null,
            },
          });
          successCount++;
          details.push({ id: item.id, ok: true });
        } else {
          await prisma.notifikasi.update({
            where: { id: item.id },
            data: {
              status: "gagal",
              error: res.error || "Gagal mengirim via gateway WhatsApp",
            },
          });
          failCount++;
          details.push({ id: item.id, ok: false, error: res.error, waLink });
        }
      } else {
        // Jika gateway belum diset, sediakan link wa.me
        failCount++;
        details.push({
          id: item.id,
          ok: false,
          error: "WA_API_KEY gateway belum aktif. Gunakan link manual WhatsApp Web.",
          waLink,
        });
      }
    }

    return NextResponse.json({
      success: successCount > 0,
      total: items.length,
      successCount,
      failCount,
      message: gatewayActive
        ? `Selesai: ${successCount} pesan berhasil dikirim ulang, ${failCount} gagal.`
        : "Gateway otomatis belum aktif. Link WhatsApp Web tersedia untuk pengiriman manual.",
      details,
    });
  } catch (error) {
    console.error("Retry WhatsApp notification error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memproses kirim ulang pesan." },
      { status: 500 }
    );
  }
}
