import { NextResponse } from "next/server";
import { getPaymentMethods } from "@/lib/duitku";

/**
 * GET /api/publik/duitku/methods?amount=50000
 * Daftar channel pembayaran yang AKTIF untuk merchant (langsung dari Duitku).
 * Publik (tanpa login) — dipakai halaman bayar untuk menampilkan metode yang benar-benar
 * tersedia. Jika gagal / belum dikonfigurasi → { enabled: false }, klien pakai fallback.
 */
export async function GET(request: Request) {
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
