import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exchangeGoogleAuthCode } from "@/lib/google-contacts";

/**
 * GET /api/integrasi/google-contacts/callback
 * Handler OAuth2 callback dari Google setelah user menyetujui izin kontak.
 */
export async function GET(request: Request) {
  const urlObj = new URL(request.url);
  const code = urlObj.searchParams.get("code");
  const error = urlObj.searchParams.get("error");

  const baseUrl = urlObj.origin;

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/pengaturan?google_status=error&error_msg=${encodeURIComponent(error)}`
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${baseUrl}/pengaturan?google_status=error&error_msg=Kode+otorisasi+tidak+ditemukan`
    );
  }

  try {
    const [dbClientId, dbClientSecret, dbRedirectUri] = await Promise.all([
      prisma.pengaturan.findUnique({ where: { key: "GOOGLE_CLIENT_ID" } }),
      prisma.pengaturan.findUnique({ where: { key: "GOOGLE_CLIENT_SECRET" } }),
      prisma.pengaturan.findUnique({ where: { key: "GOOGLE_REDIRECT_URI" } }),
    ]);

    const defaultRedirectUri = `${baseUrl}/api/integrasi/google-contacts/callback`;
    const clientId = dbClientId?.value || process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = dbClientSecret?.value || process.env.GOOGLE_CLIENT_SECRET || "";
    const redirectUri = dbRedirectUri?.value || process.env.GOOGLE_REDIRECT_URI || defaultRedirectUri;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        `${baseUrl}/pengaturan?google_status=error&error_msg=Kredensial+GOOGLE_CLIENT_ID+belum+disetel`
      );
    }

    const { refreshToken, email } = await exchangeGoogleAuthCode(code, {
      clientId,
      clientSecret,
      redirectUri,
    });

    // Simpan ke database Pengaturan
    await prisma.pengaturan.upsert({
      where: { key: "GOOGLE_REFRESH_TOKEN" },
      update: { value: refreshToken },
      create: { key: "GOOGLE_REFRESH_TOKEN", value: refreshToken },
    });

    if (email) {
      await prisma.pengaturan.upsert({
        where: { key: "GOOGLE_SYNC_EMAIL" },
        update: { value: email },
        create: { key: "GOOGLE_SYNC_EMAIL", value: email },
      });
    }

    return NextResponse.redirect(
      `${baseUrl}/pengaturan?google_status=success&email=${encodeURIComponent(email || "")}`
    );
  } catch (err: any) {
    console.error("Error penukaran Google OAuth code:", err);
    return NextResponse.redirect(
      `${baseUrl}/pengaturan?google_status=error&error_msg=${encodeURIComponent(
        err?.message || "Gagal menghubungkan akun Google"
      )}`
    );
  }
}
