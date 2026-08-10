import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDuitkuTransactionStatus } from "@/lib/duitku";
import { syncDuitkuPayment } from "@/lib/duitku-sync";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";

/**
 * GET /api/publik/duitku/status?orderId=DW-...
 * Live-check status transaksi langsung ke Duitku (fallback saat webhook tidak terjangkau),
 * lalu sinkronkan status pembayaran & tagihan.
 */
export async function GET(request: Request) {
  // Rate limit per IP — tiap request memicu panggilan API Duitku; polling normal ~6-10/menit.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await allowAttempt(`duitku-status:${ip}`, { max: 180, windowMs: 15 * 60 * 1000 }))) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(`duitku-status:${ip}`)) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId")?.trim();

  if (!orderId) {
    return NextResponse.json({ error: "orderId wajib diisi" }, { status: 400 });
  }

  const dt = await prisma.duitkuTransaction.findUnique({
    where: { orderId },
    include: { pembayaran: { include: { tagihan: true } } },
  });
  if (!dt) {
    return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
  }

  const st = await getDuitkuTransactionStatus(orderId);
  if (!st) {
    return NextResponse.json(
      { error: "Tidak dapat menghubungi Duitku. Coba lagi." },
      { status: 502 }
    );
  }

  try {
    await syncDuitkuPayment(
      dt.id,
      {
        statusCode: st.statusCode || null,
        statusMessage: st.statusMessage || null,
        reference: st.reference || dt.reference,
        amount: st.amount ? Number(st.amount) : undefined,
        rawResponse: JSON.stringify(st),
      },
      "status"
    );
  } catch {
    return NextResponse.json({ error: "Gagal sinkronisasi status" }, { status: 500 });
  }

  const pembayaran = await prisma.pembayaran.findUnique({
    where: { id: dt.pembayaranId },
    select: { status: true, metode: true },
  });
  const tagihan = await prisma.tagihan.findUnique({
    where: { id: dt.pembayaran.tagihanId },
    select: { status: true, tanggalLunas: true },
  });

  return NextResponse.json({
    orderId,
    duitkuStatus: {
      statusCode: st.statusCode,
      statusMessage: st.statusMessage,
      reference: st.reference,
      amount: st.amount,
    },
    pembayaranStatus: pembayaran?.status,
    tagihanStatus: tagihan?.status,
    tanggalLunas: tagihan?.tanggalLunas,
  });
}
