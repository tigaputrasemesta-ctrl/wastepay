import { NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { COOKIE_NAME } from "@/lib/secret";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan password harus diisi" },
        { status: 400 }
      );
    }

    // Brute-force protection: batasi per email + IP.
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const key = `login:${String(email).toLowerCase().trim()}:${ip}`;
    if (!(await allowAttempt(key))) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Coba lagi dalam ${retryAfterSeconds(key)} detik.` },
        { status: 429 }
      );
    }

    const result = await login(email, password);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({
      user: result.user,
      message: "Login berhasil",
    });

    response.cookies.set(COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal. Coba lagi." },
      { status: 500 }
    );
  }
}
