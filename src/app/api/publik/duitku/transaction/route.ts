import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createPayment, isDuitkuEnabled, truncateRaw } from "@/lib/duitku";
import { hitungRincian } from "@/lib/invoice";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/**
 * POST /api/publik/duitku/transaction
 * Buat transaksi pembayaran online (Duitku) untuk satu tagihan — pola skylite.id.
 * Body: { kode, tagihanId, paymentMethod }
 * Response: { paymentUrl, orderId, reference, pembayaranId }
 *
 * Keamanan: rate limit per IP (pembuatan transaksi jarang dilakukan user
 * sah — limit ketat mencegah spam yang menghabiskan rate limit API Duitku).
 */
export async function POST(request: Request) {
  try {
    if (!isDuitkuEnabled()) {
      return NextResponse.json(
        { error: "Pembayaran online belum diaktifkan. Hubungi pengelola." },
        { status: 503 }
      );
    }

    // Rate limit per IP — cegah spam pembuatan transaksi (DoS API Duitku)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const key = `duitku-transaksi:${ip}`;
    if (!(await allowAttempt(key, { max: 10, windowMs: 15 * 60 * 1000 }))) {
      const retry = retryAfterSeconds(key);
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${Math.ceil(retry / 60)} menit.` },
        { status: 429, headers: { "Retry-After": String(retry) } }
      );
    }

    const body = await request.json();
    const { kode, tagihanId, paymentMethod } = body;
    if (!kode || !tagihanId || !paymentMethod) {
      return NextResponse.json(
        { error: "Data tidak lengkap (kode, tagihanId, paymentMethod wajib)" },
        { status: 400 }
      );
    }

    const pelanggan = await prisma.pelanggan.findUnique({
      where: { kodePelanggan: String(kode).trim() },
      select: { id: true, nama: true, noTelepon: true, deletedAt: true },
    });
    if (!pelanggan || pelanggan.deletedAt) {
      return NextResponse.json({ error: "Kode pelanggan tidak ditemukan" }, { status: 404 });
    }

    const tagihan = await prisma.tagihan.findUnique({
      where: { id: parseInt(tagihanId) },
      select: {
        id: true, pelangganId: true, jumlah: true, denda: true,
        status: true, bulan: true, tahun: true,
      },
    });
    if (!tagihan || tagihan.pelangganId !== pelanggan.id) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan" }, { status: 404 });
    }
    if (tagihan.status === "lunas" || tagihan.status === "dibatalkan") {
      return NextResponse.json(
        { error: "Tagihan sudah lunas atau dibatalkan" },
        { status: 400 }
      );
    }

    // Cek apakah ada pembayaran manual (transfer/tunai) yang sedang pending menunggu verifikasi
    const existingManualPending = await prisma.pembayaran.findFirst({
      where: {
        tagihanId: tagihan.id,
        metode: { in: ["transfer", "tunai", "ewallet", "virtual_account"] },
        status: "pending",
      },
      select: { id: true, metode: true },
    });
    if (existingManualPending) {
      return NextResponse.json(
        {
          error: "Tagihan ini sedang dalam proses verifikasi bukti pembayaran oleh admin. Anda tidak perlu membayar ulang.",
        },
        { status: 409 }
      );
    }

    // Total yang ditagih = jumlah + PPN 11% + denda — sama dengan yang tampil di invoice
    // (lihat hitungRincian di src/lib/invoice.ts)
    const totalTagihan = hitungRincian(tagihan.jumlah, tagihan.denda).total;

    // Biaya layanan sistem web Rp 1.500 untuk operasional portal digital & notifikasi realtime
    const metodeUpper = String(paymentMethod).trim().toUpperCase();
    const isQris = metodeUpper === "QR" || metodeUpper === "SQ" || metodeUpper === "SP";
    const biayaAdmin = isQris ? 1500 : 0;
    const total = totalTagihan + biayaAdmin;

    // Reuse transaksi pending yang masih aktif jika metode pembayarannya sama & dibuat dalam 30 menit
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const existing = await prisma.pembayaran.findFirst({
      where: {
        tagihanId: tagihan.id,
        metode: "duitku",
        status: "pending",
        createdAt: { gte: thirtyMinutesAgo },
        duitkuTransaction: {
          is: {
            paymentMethod: metodeUpper,
            // Selama bukan status final gagal/expired ("02"), paymentUrl masih aktif
            NOT: { statusCode: "02" },
          },
        },
      },
      include: { duitkuTransaction: true },
      orderBy: { id: "desc" },
    });
    if (existing?.duitkuTransaction?.paymentUrl) {
      return NextResponse.json({
        paymentUrl: existing.duitkuTransaction.paymentUrl,
        orderId: existing.duitkuTransaction.orderId,
        reference: existing.duitkuTransaction.reference,
        pembayaranId: existing.id,
        reused: true,
      });
    }

    // OrderId acak (tidak dapat ditebak/enumerasi) — hindari IDOR via endpoint status publik
    const orderId = `DW-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;
    
    // Panggil API Duitku di luar transaksi DB agar tidak menahan connection pool/timeout
    const dt = await createPayment({
      orderId,
      amount: total,
      paymentMethod: metodeUpper,
      productDetails: `Iuran sampah ${BULAN[tagihan.bulan - 1]} ${tagihan.tahun} — ${pelanggan.nama}${biayaAdmin ? ` (termasuk biaya layanan sistem web Rp ${biayaAdmin.toLocaleString("id-ID")})` : ""}`,
      customerVaName: pelanggan.nama,
      phoneNumber: pelanggan.noTelepon || undefined,
    });

    // Simpan pembayaran pending & detail transaksi Duitku secara atomik
    const hasil = await prisma.$transaction(async (tx) => {
      // Batalkan transaksi gateway pending sebelumnya pada tagihan ini (agar antrean admin tidak menumpuk draf ganda)
      await tx.pembayaran.updateMany({
        where: {
          tagihanId: tagihan.id,
          metode: "duitku",
          status: "pending",
        },
        data: {
          status: "ditolak",
          catatan: `Digantikan sesi pembayaran baru (${metodeUpper})`,
        },
      });

      const p = await tx.pembayaran.create({
        data: {
          tagihanId: tagihan.id,
          pelangganId: pelanggan.id,
          jumlah: total,
          metode: "duitku",
          status: "pending",
          catatan: `Payment Gateway Via Duitku (${metodeUpper})${biayaAdmin ? ` — biaya layanan sistem web Rp ${biayaAdmin.toLocaleString("id-ID")}` : ""}`,
        },
      });

      await tx.duitkuTransaction.create({
        data: {
          orderId,
          pembayaranId: p.id,
          paymentUrl: dt.paymentUrl || null,
          reference: dt.reference || null,
          paymentMethod: metodeUpper,
          statusCode: "01", // Default "01" (proses/pending pembayaran di Duitku)
          statusMessage: dt.statusMessage || "PROCESS",
          amount: dt.amount ? Number(dt.amount) : total,
          rawResponse: truncateRaw(dt),
        },
      });

      return { p, orderId, reference: dt.reference || null, paymentUrl: dt.paymentUrl || "" };
    });

    return NextResponse.json(hasil);
  } catch (error) {
    // Detail error (pesan dari API Duitku / stack) hanya untuk log server —
    // jangan diekspos ke client (bisa bocorkan detail konfigurasi internal).
    console.error("Duitku transaction error:", error);
    const msg = error instanceof Error ? error.message : "";
    if (/payment channel not available|channel.*tidak tersedia/i.test(msg)) {
      return NextResponse.json(
        { error: "Metode pembayaran ini tidak tersedia di penyedia — pilih metode lain." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: `Gagal membuat transaksi pembayaran. Detail error: ${msg}` }, { status: 500 });
  }
}
