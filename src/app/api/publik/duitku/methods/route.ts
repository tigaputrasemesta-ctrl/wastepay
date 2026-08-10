import { NextResponse } from "next/server";
import { getPaymentMethods } from "@/lib/duitku";
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

  const methods = await getPaymentMethods(amount);
  if (!methods) {
    // Belum dikonfigurasi / Duitku tidak merespon — klien pakai daftar fallback.
    return NextResponse.json({ enabled: false, methods: [] });
  }

  return NextResponse.json({ enabled: true, methods });
}
