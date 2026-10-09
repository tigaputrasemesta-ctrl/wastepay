import { NextResponse } from "next/server";
import { getPaymentMethods } from "@/lib/duitku";
import { channelAllowed } from "@/lib/duitku-channels";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";

/**
 * GET /api/publik/duitku/methods?amount=50000
 * Daftar channel pembayaran yang AKTIF untuk merchant (langsung dari Duitku).
 * Publik (tanpa login) — dipakai halaman bayar untuk menampilkan metode yang benar-benar
 * tersedia. Jika gagal / belum dikonfigurasi → { enabled: false }, klien pakai fallback.
 */
export async function GET(request: Request) {
  // Rate limit per IP — endpoint ini memicu panggilan ke API Duitku (biaya/hammering).
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await allowAttempt(`duitku-methods:${ip}`, { max: 30, windowMs: 15 * 60 * 1000 }))) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(`duitku-methods:${ip}`)) } }
    );
  }

  const { searchParams } = new URL(request.url);
  const amount = parseInt(searchParams.get("amount") || "0", 10);
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "amount wajib diisi (nominal transaksi)" }, { status: 400 });
  }

  const raw = await getPaymentMethods(amount);
  if (!raw) {
    // Belum dikonfigurasi / Duitku tidak merespon — klien pakai daftar fallback.
    return NextResponse.json({ enabled: false, methods: [] });
  }

  // Filter: hanya channel yang benar-benar aktif di merchant (inquiry terverifikasi).
  // getPaymentMethod Duitku sering mengembalikan channel "enabled" yang saat
  // inquiry ditolak (HTTP 404 "Payment channel not available").
  const QRIS_CODES = new Set(["QR", "SQ"]);
  const BIAYA_ADMIN_QRIS = 1000;
  const methods = raw
    .filter((m) => channelAllowed(m.paymentMethod))
    .map((m) => {
      if (QRIS_CODES.has(m.paymentMethod.toUpperCase())) {
        const existingFee = parseInt(m.totalFee || "0", 10) || 0;
        return { ...m, totalFee: String(existingFee + BIAYA_ADMIN_QRIS) };
      }
      return m;
    });

  return NextResponse.json({ enabled: methods.length > 0, methods });
}
