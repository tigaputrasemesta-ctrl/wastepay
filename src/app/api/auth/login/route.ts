import { NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { COOKIE_NAME } from "@/lib/secret";
import { resolveTenantByHost } from "@/lib/tenant";

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

    // Proteksi isolasi login tenant
    const rawHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const tenantCtx = resolveTenantByHost(rawHost);

    if (result.user.role !== "superadmin") {
      if (tenantCtx.isCore) {
        return NextResponse.json(
          { error: "Akun operasional mitra tidak dapat login di Core SaaS Hub. Silakan gunakan portal resmi mitra Anda." },
          { status: 403 }
        );
      }
      if (result.user.tenantId && result.user.tenantId !== tenantCtx.tenant.id) {
        return NextResponse.json(
          { error: `Akun ini tidak terdaftar pada layanan ${tenantCtx.tenant.namaMitra}.` },
          { status: 403 }
        );
      }
    }

    // Jika akun petugas, berikan masa berlaku cookie 90 hari agar tidak mudah terlogout
    const isPetugas = result.user.role === "petugas";
    const cookieMaxAge = isPetugas ? 90 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

    const response = NextResponse.json({
      user: result.user,
      token: result.token,
      message: "Login berhasil",
    });

    const isHttps =
      request.headers.get("x-forwarded-proto") === "https" ||
      request.url.startsWith("https://");

    response.cookies.set(COOKIE_NAME, result.token, {
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: cookieMaxAge,
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
