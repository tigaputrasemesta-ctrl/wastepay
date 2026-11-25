import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildCorsHeaders } from "@/lib/server/wastepay-backend-core-services";
import { decryptCredential } from "@/lib/credential-vault";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

/**
 * POST /api/core/tenants/[id]/check-wa-device
 * Memeriksa status perangkat Fonnte secara langsung, sisa kuota, pesan terkirim,
 * paket langganan Fonnte, dan masa aktif untuk tenant tertentu.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = buildCorsHeaders(request);
  const { id } = await params;

  try {
    const session = await getSession();
    if (!session || (session.role !== "superadmin" && session.role !== "admin")) {
      return NextResponse.json(
        { error: "Unauthorized: Hanya admin atau superadmin yang dapat memeriksa perangkat WA." },
        { status: 401, headers: corsHeaders }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        waConfig: true,
        quotaUsage: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant tidak ditemukan." },
        { status: 404, headers: corsHeaders }
      );
    }

    // Ambil opsi dari request body (misal jika admin ingin tes token baru sebelum disimpan)
    const body = await request.json().catch(() => ({}));
    const deviceIndex = body.deviceIndex === 2 ? 2 : 1;
    let apiKey = body.apiKey ? String(body.apiKey).trim() : "";

    if (!apiKey) {
      const storedKey = deviceIndex === 2 ? tenant.waConfig?.waApiKey2 : tenant.waConfig?.waApiKey1;
      if (storedKey) {
        apiKey = decryptCredential(storedKey) || storedKey;
      }
    }

    if (!apiKey) {
      // Fallback untuk pilot UPS HERU jika belum diset
      if (tenant.slug === "upsheru") {
        apiKey = process.env.WA_API_KEY_HERU || "yZeWGJymbrnTpub2x5rL";
      } else {
        return NextResponse.json(
          { error: `API Token Fonnte untuk Device ${deviceIndex} belum dikonfigurasi.` },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Panggil Fonnte API untuk mendapatkan data perangkat & kuota riil
    const fonnteEndpoint = "https://api.fonnte.com/device";
    let fonnteData: any = null;
    let isFonnteOk = false;

    try {
      const fonnteRes = await fetch(fonnteEndpoint, {
        method: "POST",
        headers: {
          Authorization: apiKey,
        },
        signal: AbortSignal.timeout(8000),
      });

      fonnteData = await fonnteRes.json().catch(() => null);
      isFonnteOk = fonnteRes.ok && fonnteData && fonnteData.status !== false;
    } catch (netErr: any) {
      console.warn(`[Fonnte Check] Network timeout / error to Fonnte for tenant ${tenant.slug}:`, netErr.message);
    }

    if (!isFonnteOk || !fonnteData) {
      // Jika Fonnte mengembalikan error atau device belum terkoneksi
      return NextResponse.json(
        {
          success: false,
          connected: false,
          reason: fonnteData?.reason || fonnteData?.message || "Perangkat tidak terhubung atau API Token Fonnte tidak valid.",
          deviceIndex,
          testedTokenMasked: apiKey.slice(0, 4) + "••••" + apiKey.slice(-4),
        },
        { headers: corsHeaders }
      );
    }

    // Fonnte mengembalikan data: device, name, expired, package, quota, messages, device_status
    const quotaTotal = Number(fonnteData.quota) || 0;
    const messagesUsed = Number(fonnteData.messages) || 0;
    const remainingQuota = Math.max(0, quotaTotal - messagesUsed);
    const deviceStatus = String(fonnteData.device_status || "connect").toLowerCase();
    const isConnected = deviceStatus === "connect";

    // Sinkronkan ke database TenantQuotaUsage agar status terkini tersimpan
    try {
      await prisma.tenantQuotaUsage.upsert({
        where: { tenantId: tenant.id },
        update: {
          pesanTerkirim: messagesUsed,
        },
        create: {
          tenantId: tenant.id,
          kuotaBulanan: quotaTotal || 1000,
          pesanTerkirim: messagesUsed,
          biayaPerPesanOverage: 150,
          periodeMulai: new Date(),
          periodeBerakhir: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (dbErr) {
      console.warn("[Fonnte Check] Gagal update quota database:", dbErr);
    }

    return NextResponse.json(
      {
        success: true,
        connected: isConnected,
        deviceStatus,
        device: fonnteData.device || (deviceIndex === 2 ? tenant.waConfig?.waNumber2 : tenant.waConfig?.waNumber1),
        name: fonnteData.name || `Device ${tenant.namaMitra}`,
        package: fonnteData.package || "Regular",
        expired: fonnteData.expired || "-",
        quotaTotal,
        messagesUsed,
        remainingQuota,
        deviceIndex,
        testedTokenMasked: apiKey.slice(0, 4) + "••••" + apiKey.slice(-4),
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Fonnte Check API] Error:", error);
    return NextResponse.json(
      { error: "Gagal memeriksa status perangkat Fonnte: " + error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
