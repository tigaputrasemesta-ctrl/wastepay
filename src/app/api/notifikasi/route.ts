import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import {
  isWaEnabled,
  kirimBlastWa,
  type TargetWa,
} from "@/lib/wa";

/**
 * POST /api/notifikasi
 * Kirim notifikasi WhatsApp ke pelanggan (spesifik atau semua).
 * Body: { tipe, judul, pesan, pelangganId? }
 *
 * Jika WA_API_KEY dikonfigurasi → kirim otomatis (status terkirim/gagal, delay anti-spam).
 * Jika tidak → simpan pending + kembalikan link wa.me untuk kirim manual.
 */
export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { tipe, judul, pesan, pelangganId } = body;

    if (!judul || !pesan) {
      return NextResponse.json({ error: "Judul dan pesan harus diisi" }, { status: 400 });
    }

    let targets: TargetWa[] = [];

    if (pelangganId) {
      const p = await prisma.pelanggan.findUnique({
        where: { id: parseInt(pelangganId) },
        select: { id: true, nama: true, noTelepon: true },
      });
      if (!p) {
        return NextResponse.json({ error: "Pelanggan tidak ditemukan" }, { status: 404 });
      }
      targets = [{ pelangganId: p.id, nama: p.nama, noTelepon: p.noTelepon }];
    } else {
      targets = (await prisma.pelanggan.findMany({
        where: { status: "aktif", deletedAt: null },
        select: { id: true, nama: true, noTelepon: true },
      })).map((p) => ({ pelangganId: p.id, nama: p.nama, noTelepon: p.noTelepon }));
    }

    const autoSend = isWaEnabled();
    const hasil = await kirimBlastWa(
      targets,
      tipe || "pengumuman",
      async () => ({ judul, pesan: `*${judul}*\n\n${pesan}\n\n— UPS HERU DEPOK` }),
      { createdById: user.id }
    );

    return NextResponse.json({
      message: autoSend
        ? `${hasil.terkirim} terkirim, ${hasil.gagal} gagal`
        : `${hasil.pending} notifikasi siap dikirim manual`,
      sent: hasil.terkirim + hasil.pending,
      terkirim: hasil.terkirim,
      failed: hasil.gagal,
      autoSend,
      failures: hasil.failures.length > 0 ? hasil.failures : undefined,
      // Link wa.me untuk kirim manual (fallback & ketika auto-send gagal)
      links: hasil.links.length > 0 ? hasil.links : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Gagal mengirim notifikasi" }, { status: 500 });
  }
}

export async function GET() {
  const user = await getSession();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const notifikasi = await prisma.notifikasi.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      pelanggan: { select: { id: true, nama: true } },
      createdBy: { select: { id: true, nama: true } },
    },
  });

  return NextResponse.json(notifikasi);
}
