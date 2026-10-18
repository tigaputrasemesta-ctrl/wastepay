import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/server-rbac";
import {
  getGoogleAuthUrl,
  refreshGoogleAccessToken,
  syncPelangganToGooglePeopleApi,
  type PelangganForContact,
} from "@/lib/google-contacts";

/**
 * GET /api/integrasi/google-contacts
 * Cek status konfigurasi, email tersambung, dan URL otorisasi
 */
export async function GET(request: Request) {
  const auth = await requireRole(request, "admin");
  if (auth instanceof NextResponse) {
    return auth;
  }

  // 1. Ambil config dari env atau DB
  const [dbClientId, dbClientSecret, dbRedirectUri, dbRefreshToken, dbSyncEmail, dbLastSync] =
    await Promise.all([
      prisma.pengaturan.findUnique({ where: { key: "GOOGLE_CLIENT_ID" } }),
      prisma.pengaturan.findUnique({ where: { key: "GOOGLE_CLIENT_SECRET" } }),
      prisma.pengaturan.findUnique({ where: { key: "GOOGLE_REDIRECT_URI" } }),
      prisma.pengaturan.findUnique({ where: { key: "GOOGLE_REFRESH_TOKEN" } }),
      prisma.pengaturan.findUnique({ where: { key: "GOOGLE_SYNC_EMAIL" } }),
      prisma.pengaturan.findUnique({ where: { key: "GOOGLE_LAST_SYNC_AT" } }),
    ]);

  const urlObj = new URL(request.url);
  const defaultRedirectUri = `${urlObj.origin}/api/integrasi/google-contacts/callback`;

  const clientId = dbClientId?.value || process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = dbClientSecret?.value || process.env.GOOGLE_CLIENT_SECRET || "";
  const redirectUri = dbRedirectUri?.value || process.env.GOOGLE_REDIRECT_URI || defaultRedirectUri;
  const refreshToken = dbRefreshToken?.value || process.env.GOOGLE_REFRESH_TOKEN || "";
  const syncEmail = dbSyncEmail?.value || process.env.GOOGLE_SYNC_EMAIL || null;
  const lastSyncAt = dbLastSync?.value || null;

  const isConfigured = Boolean(clientId && clientSecret);
  const isAuthorized = Boolean(refreshToken);

  let authUrl: string | null = null;
  if (isConfigured) {
    authUrl = getGoogleAuthUrl({
      clientId,
      clientSecret,
      redirectUri,
    });
  }

  const totalPelanggan = await prisma.pelanggan.count({
    where: { deletedAt: null },
  });

  return NextResponse.json({
    success: true,
    data: {
      configured: isConfigured,
      authorized: isAuthorized,
      targetEmail: syncEmail,
      lastSyncAt,
      redirectUri,
      authUrl,
      totalPelanggan,
      clientId,
      hasSecret: Boolean(clientSecret),
    },
  });
}

/**
 * POST /api/integrasi/google-contacts
 * Jalankan sinkronisasi data pelanggan ke Google Contacts
 */
export async function POST(request: Request) {
  const auth = await requireRole(request, "admin");
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const [dbClientId, dbClientSecret, dbRedirectUri, dbRefreshToken] = await Promise.all([
      prisma.pengaturan.findUnique({ where: { key: "GOOGLE_CLIENT_ID" } }),
      prisma.pengaturan.findUnique({ where: { key: "GOOGLE_CLIENT_SECRET" } }),
      prisma.pengaturan.findUnique({ where: { key: "GOOGLE_REDIRECT_URI" } }),
      prisma.pengaturan.findUnique({ where: { key: "GOOGLE_REFRESH_TOKEN" } }),
    ]);

    const urlObj = new URL(request.url);
    const defaultRedirectUri = `${urlObj.origin}/api/integrasi/google-contacts/callback`;

    const clientId = dbClientId?.value || process.env.GOOGLE_CLIENT_ID || "";
    const clientSecret = dbClientSecret?.value || process.env.GOOGLE_CLIENT_SECRET || "";
    const redirectUri = dbRedirectUri?.value || process.env.GOOGLE_REDIRECT_URI || defaultRedirectUri;
    const refreshToken = dbRefreshToken?.value || process.env.GOOGLE_REFRESH_TOKEN || "";

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { success: false, error: "GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum disetel." },
        { status: 400 }
      );
    }

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "Akun Google belum dihubungkan. Silakan lakukan otorisasi terlebih dahulu." },
        { status: 400 }
      );
    }

    // 1. Refresh access token
    const accessToken = await refreshGoogleAccessToken(refreshToken, {
      clientId,
      clientSecret,
      redirectUri,
    });

    // 2. Baca opsi request body (opsional)
    let updateExisting = false;
    let groupName = "Pelanggan WastePay";
    try {
      const body = await request.json();
      if (typeof body.updateExisting === "boolean") updateExisting = body.updateExisting;
      if (typeof body.groupName === "string" && body.groupName.trim()) groupName = body.groupName.trim();
    } catch {
      // Body kosong / no json, gunakan default
    }

    // 3. Ambil data pelanggan aktif
    const customers = await prisma.pelanggan.findMany({
      where: { deletedAt: null },
      include: {
        kelurahan: true,
        wilayah: {
          include: {
            zona: true,
          },
        },
        paket: true,
      },
      orderBy: [{ kelurahanId: "asc" }, { nama: "asc" }],
    });

    // 4. Jalankan sinkronisasi via Google People API
    const syncResult = await syncPelangganToGooglePeopleApi({
      customers: customers as unknown as PelangganForContact[],
      accessToken,
      groupName,
      updateExisting,
    });

    // 5. Simpan waktu sinkronisasi terakhir
    const nowIso = new Date().toISOString();
    await prisma.pengaturan.upsert({
      where: { key: "GOOGLE_LAST_SYNC_AT" },
      update: { value: nowIso },
      create: { key: "GOOGLE_LAST_SYNC_AT", value: nowIso },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...syncResult,
        lastSyncAt: nowIso,
      },
    });
  } catch (err: any) {
    console.error("Error sinkronisasi Google Contacts:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Terjadi kesalahan internal saat sinkronisasi." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/integrasi/google-contacts
 * Simpan konfigurasi kredensial Google Client ID & Client Secret ke database Pengaturan
 */
export async function PUT(request: Request) {
  const auth = await requireRole(request, "admin");
  if (auth instanceof NextResponse) {
    return auth;
  }

  try {
    const body = await request.json();
    const { clientId, clientSecret, redirectUri } = body;

    if (!clientId || typeof clientId !== "string") {
      return NextResponse.json(
        { success: false, error: "Client ID wajib diisi." },
        { status: 400 }
      );
    }

    const updates: Promise<any>[] = [
      prisma.pengaturan.upsert({
        where: { key: "GOOGLE_CLIENT_ID" },
        update: { value: clientId.trim() },
        create: { key: "GOOGLE_CLIENT_ID", value: clientId.trim() },
      }),
    ];

    if (clientSecret && typeof clientSecret === "string") {
      updates.push(
        prisma.pengaturan.upsert({
          where: { key: "GOOGLE_CLIENT_SECRET" },
          update: { value: clientSecret.trim() },
          create: { key: "GOOGLE_CLIENT_SECRET", value: clientSecret.trim() },
        })
      );
    }

    if (redirectUri && typeof redirectUri === "string") {
      updates.push(
        prisma.pengaturan.upsert({
          where: { key: "GOOGLE_REDIRECT_URI" },
          update: { value: redirectUri.trim() },
          create: { key: "GOOGLE_REDIRECT_URI", value: redirectUri.trim() },
        })
      );
    }

    await Promise.all(updates);

    return NextResponse.json({
      success: true,
      message: "Kredensial Google Contacts berhasil disimpan ke database.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Gagal menyimpan kredensial Google." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/integrasi/google-contacts
 * Putuskan akun Google yang terhubung (hapus refresh token)
 */
export async function DELETE(request: Request) {
  const auth = await requireRole(request, "admin");
  if (auth instanceof NextResponse) {
    return auth;
  }

  await Promise.all([
    prisma.pengaturan.deleteMany({
      where: {
        key: {
          in: ["GOOGLE_REFRESH_TOKEN", "GOOGLE_SYNC_EMAIL", "GOOGLE_LAST_SYNC_AT"],
        },
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: "Koneksi akun Google berhasil diputuskan.",
  });
}
