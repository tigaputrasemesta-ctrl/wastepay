import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/auth";
import { isWaEnabled, kirimWhatsApp, templateUpdateKomplainPelanggan } from "@/lib/wa";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = parseInt((await params).id);
    const body = await request.json();
    const { status, tanggapan } = body;

    // Normalisasi: jika ada input "diproses", petakan ke "proses"
    const normalizedStatus = status === "diproses" ? "proses" : status;

    // Status valid
    const STATUS_VALID = ["baru", "proses", "selesai", "ditolak"];
    if (normalizedStatus && !STATUS_VALID.includes(normalizedStatus)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }

    // resolvedById dari session — bukan dari body (anti spoofing)
    const session = await getSession();

    const komplain = await prisma.komplain.update({
      where: { id },
      data: {
        ...(normalizedStatus ? { status: normalizedStatus } : {}),
        ...(tanggapan !== undefined ? { tanggapan } : {}),
        ...(normalizedStatus === "selesai" || normalizedStatus === "ditolak"
          ? { resolvedById: session?.id ?? null }
          : {}),
      },
      include: {
        pelanggan: {
          select: { nama: true, noTelepon: true },
        },
      },
    });

    // Kirim notifikasi WA real-time ke pelanggan mengenai pembaruan tiket pengaduan
    if (isWaEnabled() && komplain.pelanggan?.noTelepon && (normalizedStatus || tanggapan)) {
      try {
        const pesan = templateUpdateKomplainPelanggan({
          tiketId: komplain.id,
          namaPelanggan: komplain.pelanggan.nama,
          status: komplain.status,
          tanggapan: tanggapan || komplain.tanggapan,
        });
        kirimWhatsApp(komplain.pelanggan.noTelepon, pesan).catch(() => {});
      } catch (err) {
        console.error("[Komplain WA Notification Error]:", err);
      }
    }

    await logAudit("update", "Komplain", id, { id }, { status: komplain.status });
    return NextResponse.json(komplain);
  } catch {
    return NextResponse.json({ error: "Gagal mengupdate komplain" }, { status: 500 });
  }
}
