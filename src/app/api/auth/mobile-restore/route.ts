import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createMobileSession, verifySessionToken } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/secret";

/**
 * POST /api/auth/mobile-restore
 * Khusus aplikasi Android / APK Lapangan:
 * Me-restore cookie sesi login dari persistent token lokal di perangkat jika
 * WebView kehilangan cookie akibat proses background/sleep oleh sistem Android.
 * Memastikan petugas pickup TIDAK PERNAH terlogout sebelum menekan tombol logout manual.
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    let token = "";
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
    } else {
      const body = await request.json().catch(() => ({}));
      token = body?.token?.trim() || "";
    }

    if (!token) {
      return NextResponse.json({ error: "Token tidak ditemukan" }, { status: 400 });
    }

    const sessionUser = await verifySessionToken(token);
    if (!sessionUser) {
      return NextResponse.json(
        { error: "Sesi tidak valid atau telah dicabut. Silakan login kembali." },
        { status: 401 }
      );
    }

    // Ambil data user terkini untuk update tokenVersion jika ada
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, email: true, nama: true, role: true, tokenVersion: true, aktif: true },
    });

    if (!user || !user.aktif) {
      return NextResponse.json({ error: "Akun tidak aktif" }, { status: 401 });
    }

    // Buat token sesi mobile tahan lama (90 hari)
    const freshToken = await createMobileSession({
      id: user.id,
      email: user.email,
      nama: user.nama,
      role: user.role,
      tokenVersion: user.tokenVersion,
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, nama: user.nama, role: user.role },
      token: freshToken,
    });

    // Pasang cookie sesi 90 hari
    response.cookies.set(COOKIE_NAME, freshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 90 * 24 * 60 * 60, // 90 hari
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Mobile Restore Error:", error);
    return NextResponse.json({ error: "Gagal memulihkan sesi mobile" }, { status: 500 });
  }
}
