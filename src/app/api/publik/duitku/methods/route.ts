import { NextResponse } from "next/server";
import { getPaymentMethods } from "@/lib/duitku";
import { channelAllowed, DUITKU_METHODS } from "@/lib/duitku-channels";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";

const FEE_CODES = new Set<string>(["SP", "SQ"]);
const BIAYA_ADMIN = 1000;

/**
 * GET /api/publik/duitku/methods?amount=50000
 * Daftar channel pembayaran yang AKTIF untuk merchant (langsung dari Duitku).
 * Publik (tanpa login) — dipakai halaman bayar untuk menampilkan metode yang benar-benar
 * tersedia. Jika gagal / belum dikonfigurasi → fallback ke DUITKU_METHODS.
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
    // Belum dikonfigurasi / Duitku tidak merespon — pakai daftar fallback langsung.
    const fallback = DUITKU_METHODS.map((m) => ({
      paymentMethod: m.value,
      paymentName: m.label,
      paymentImage: m.imageUrl,
      totalFee: m.totalFee || (FEE_CODES.has(m.value) ? String(BIAYA_ADMIN) : undefined),
    }));
    return NextResponse.json({ enabled: fallback.length > 0, methods: fallback });
  }

  // Filter dari Duitku: hanya channel yang diizinkan.
  const fromApi = raw
    .filter((m) => channelAllowed(m.paymentMethod))
    .map((m) => {
      if (FEE_CODES.has(m.paymentMethod.toUpperCase())) {
        const existingFee = parseInt(m.totalFee || "0", 10) || 0;
        return { ...m, totalFee: String(existingFee + BIAYA_ADMIN) };
      }
      return m;
    });

  // Gabungkan fallback methods yang tidak dikembalikan oleh Duitku API
  // (mis. OVO/ShopeePay sudah aktif di dashboard tapi API belum mengembalikannya).
  const existingCodes = new Set(fromApi.map((m) => m.paymentMethod.toUpperCase()));
  const extras = DUITKU_METHODS
    .filter((m) => !existingCodes.has(m.value.toUpperCase()))
    .map((m) => ({
      paymentMethod: m.value,
      paymentName: m.label,
      paymentImage: m.imageUrl,
      totalFee: m.totalFee || (FEE_CODES.has(m.value) ? String(BIAYA_ADMIN) : undefined),
    }));

  const methods = [...fromApi, ...extras];

  return NextResponse.json({ enabled: methods.length > 0, methods });
}
