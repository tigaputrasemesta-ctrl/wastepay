import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";

/**
 * POST /api/seed/admin — buat akun superadmin awal (sekali pakai).
 *
 * AMAN: route ini DI LUAR /api/auth (tidak di-bypass proxy) sehingga proxy
 * menegakkan level 100 (superadmin). Handler juga cek sesi superadmin
 * (defense-in-depth) + rate limit. Password hanya muncul sekali saat dibuat.
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await allowAttempt(`seed-admin:${ip}`, { max: 5, windowMs: 15 * 60 * 1000 }))) {
    return NextResponse.json(
      { error: "Terlalu banyak percobaan. Coba lagi nanti." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds(`seed-admin:${ip}`)) } }
    );
  }

  // Defense-in-depth: hanya superadmin yang sudah login bisa membuat admin.
  const session = await getSession();
  if (!session || !hasRole(session, "superadmin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin.herozerowaste@gmail.com" },
    });

    if (existingAdmin) {
      return NextResponse.json({
        message: "Admin sudah ada. Gunakan fitur 'Ganti Password' di Pengaturan jika lupa.",
      });
    }

    // Password acak sekali pakai — ditampilkan hanya saat pembuatan
    const password = randomBytes(9).toString("base64url");
    const hashedPassword = await hashPassword(password);

    await prisma.user.create({
      data: {
        email: "admin.herozerowaste@gmail.com",
        password: hashedPassword,
        nama: "Admin TPS HERU",
        role: "superadmin",
      },
    });

    return NextResponse.json({
      message: "Admin berhasil dibuat",
      // Hanya muncul sekali — segera ganti password setelah login pertama
      password,
      note: "Simpan password ini dan segera ganti setelah login.",
    });
  } catch {
    return NextResponse.json({ error: "Gagal membuat admin" }, { status: 500 });
  }
}
