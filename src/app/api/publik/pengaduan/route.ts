import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { adminPhone, isWaEnabled, kirimWhatsApp } from "@/lib/wa";

const JENIS_VALID = ["tidak_diangkut", "sampah_menumpuk", "lainnya"];

export const dynamic = "force-dynamic";

/**
 * Pengaduan publik: pelanggan memasukkan KODE PELANGGAN lalu mengisi keluhan.
 * Komplain langsung muncul di peta admin (live view).
 */
export async function POST(request: Request) {
  // Rate limit per IP: mencegah spam formulir publik
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const key = `pengaduan:${ip}`;
  if (!(await allowAttempt(key))) {
    const retry = retryAfterSeconds(key);
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(retry / 60)} menit.` },
      { status: 429, headers: { "Retry-After": String(retry) } }
    );
  }

  try {
    const body = await request.json();
    const kodePelanggan = String(body.kodePelanggan ?? "").trim().toUpperCase();
    const jenis = JENIS_VALID.includes(body.jenis) ? body.jenis : "lainnya";
    const deskripsi = String(body.deskripsi ?? "").trim();

    if (!kodePelanggan) {
      return NextResponse.json({ error: "Kode pelanggan wajib diisi." }, { status: 400 });
    }
    if (deskripsi.length < 10) {
      return NextResponse.json(
        { error: "Deskripsi keluhan minimal 10 karakter." },
        { status: 400 }
      );
    }
    if (deskripsi.length > 1000) {
      return NextResponse.json({ error: "Deskripsi maksimal 1000 karakter." }, { status: 400 });
    }

    const pelanggan = await prisma.pelanggan.findFirst({
      where: { kodePelanggan, deletedAt: null },
    });
    if (!pelanggan) {
      return NextResponse.json(
        { error: "Kode pelanggan tidak ditemukan. Periksa kembali kode di kartu/barcode Anda." },
        { status: 404 }
      );
    }

    const komplain = await prisma.komplain.create({
      data: { jenis, deskripsi, status: "baru", pelangganId: pelanggan.id },
      select: { id: true, jenis: true, deskripsi: true, status: true, createdAt: true },
    });

    // Notifikasi ke admin via WhatsApp (jika dikonfigurasi)
    let notifWa: { ok: boolean; error?: string } | null = null;
    if (isWaEnabled() && adminPhone()) {
      const pesan = [
        "[PENGADUAN BARU]",
        `Nama: ${pelanggan.nama}`,
        `Kode: ${pelanggan.kodePelanggan}`,
        `Telp: ${pelanggan.noTelepon}`,
        `Keluhan: ${deskripsi.slice(0, 150)}${deskripsi.length > 150 ? "…" : ""}`,
      ].join("\n");
      notifWa = await kirimWhatsApp(adminPhone(), pesan);
    }

    return NextResponse.json(
      {
        ok: true,
        id: komplain.id,
        status: komplain.status,
        namaPelanggan: pelanggan.nama,
        kodePelanggan: pelanggan.kodePelanggan,
        notifWa: notifWa?.ok ?? false,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Gagal mengirim pengaduan. Coba lagi." }, { status: 500 });
  }
}
