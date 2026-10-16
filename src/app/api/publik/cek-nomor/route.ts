import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalisasiTelepon } from "@/lib/daftar";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!(await allowAttempt(`cek-nomor:${ip}`, { max: 20, windowMs: 60 * 1000 }))) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Silakan coba beberapa saat lagi." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(`cek-nomor:${ip}`)) },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const telp = searchParams.get("telp");

  if (!telp) {
    return NextResponse.json({ error: "Nomor telepon tidak diberikan." }, { status: 400 });
  }

  const noTelepon = normalisasiTelepon(telp);

  try {
    const pelanggan = await prisma.pelanggan.findUnique({
      where: { noTelepon },
      select: { id: true, status: true },
    });

    if (pelanggan) {
      return NextResponse.json({
        terdaftar: true,
        pesan: "Nomor WhatsApp ini sudah terdaftar sebagai pelanggan.",
      });
    }

    return NextResponse.json({ terdaftar: false, pesan: "Nomor tersedia." });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan sistem." }, { status: 500 });
  }
}
