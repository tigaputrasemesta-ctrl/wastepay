import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { randomBytes } from "crypto";

export async function POST() {
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
        nama: "Admin O2W",
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
