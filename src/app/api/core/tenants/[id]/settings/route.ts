import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { buildCorsHeaders } from "@/lib/server/wastepay-backend-core-services";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

/**
 * GET: Ambil pengaturan WhatsApp (2 nomor mitra) dan Payment Gateway / Komisi Transaksi per tenant
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = buildCorsHeaders(request);
  const { id } = await params;

  try {
    const session = await getSession();
    if (!session || (session.role !== "superadmin" && session.role !== "admin")) {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Superadmin yang berwenang mengakses pengaturan tenant." },
        { status: 403, headers: corsHeaders }
      );
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        waConfig: true,
        quotaUsage: true,
        paymentConfig: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Mitra tenant tidak ditemukan." },
        { status: 404, headers: corsHeaders }
      );
    }

    // Default Fallback Initializer jika record belum pernah dibuat
    let waConfig = tenant.waConfig;
    if (!waConfig) {
      const isPilot = tenant.slug === "upsheru";
      waConfig = await prisma.tenantWhatsAppConfig.create({
        data: {
          tenantId: tenant.id,
          gatewayMode: "dedicated_mitra",
          provider: "fonnte",
          waNumber1: isPilot ? "081400782617" : tenant.noTelepon || "",
          waApiKey1: isPilot ? "yZeWGJymbrnTpub2x5rL" : "",
          waLabel1: "Nomor Utama (Bot & Tagihan)",
          waNumber2: isPilot ? "085716251003" : "",
          waApiKey2: "",
          waLabel2: "Nomor CS & Pengaduan",
          adminPhone: tenant.noTelepon || "",
          ownerPhone: "",
          waGroupTagihan: isPilot ? "120363432695009362@g.us" : "",
          waGroupPengaduan: isPilot ? "120363430666363149@g.us" : "",
          blastDelayMs: 1500,
          autoSendEnabled: true,
        },
      });
    }

    let quotaUsage = tenant.quotaUsage;
    if (!quotaUsage) {
      const isPro = tenant.paketLangganan === "pro" || tenant.slug === "upsheru";
      const isEnterprise = tenant.paketLangganan === "enterprise";
      const kuotaBulanan = isEnterprise ? 20000 : isPro ? 5000 : 1000;
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);

      quotaUsage = await prisma.tenantQuotaUsage.create({
        data: {
          tenantId: tenant.id,
          kuotaBulanan,
          kuotaTopup: 0,
          pesanTerkirim: 0,
          pesanGagal: 0,
          overdraftUsed: 0,
          biayaPerPesanOverage: 150,
          periodeMulai: new Date(),
          periodeBerakhir: nextMonth,
        },
      });
    }

    let paymentConfig = tenant.paymentConfig;
    if (!paymentConfig) {
      paymentConfig = await prisma.tenantPaymentConfig.create({
        data: {
          tenantId: tenant.id,
          gatewayMode: "centralized_pool",
          feeBearerPolicy: "hybrid",
          adminFeeQris: 1500,
          adminFeeVa: 3500,
          adminFeeEwallet: 2000,
          platformFeeNominal: 1000,
          platformFeeRate: 0,
          bankName: "BCA",
          bankAccountNumber: "",
          bankAccountHolder: tenant.penanggungJawab || tenant.namaMitra,
          payoutSchedule: "weekly",
          aktif: true,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        tenant: {
          id: tenant.id,
          slug: tenant.slug,
          namaMitra: tenant.namaMitra,
          paketLangganan: tenant.paketLangganan,
          customDomain: tenant.customDomain,
          status: tenant.status,
        },
        waConfig,
        quotaUsage,
        paymentConfig,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Tenant Settings API] Error:", error);
    return NextResponse.json(
      { error: "Gagal memuat pengaturan tenant: " + error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * PUT: Simpan pembaruan pengaturan WhatsApp (2 nomor) & Gateway / Komisi
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const corsHeaders = buildCorsHeaders(request);
  const { id } = await params;

  try {
    const session = await getSession();
    if (!session || (session.role !== "superadmin" && session.role !== "admin")) {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Superadmin yang berwenang mengubah pengaturan." },
        { status: 403, headers: corsHeaders }
      );
    }

    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: "Mitra tenant tidak ditemukan." },
        { status: 404, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { waConfig, quotaUsage, paymentConfig } = body;

    // 1. Perbarui WhatsApp Config (2 Nomor Device Mitra)
    if (waConfig) {
      await prisma.tenantWhatsAppConfig.upsert({
        where: { tenantId: tenant.id },
        update: {
          gatewayMode: waConfig.gatewayMode || "dedicated_mitra",
          provider: waConfig.provider || "fonnte",
          waNumber1: waConfig.waNumber1 ? String(waConfig.waNumber1).trim() : null,
          waApiKey1: waConfig.waApiKey1 ? String(waConfig.waApiKey1).trim() : null,
          waLabel1: waConfig.waLabel1 || "Nomor Utama (Bot & Tagihan)",
          waNumber2: waConfig.waNumber2 ? String(waConfig.waNumber2).trim() : null,
          waApiKey2: waConfig.waApiKey2 ? String(waConfig.waApiKey2).trim() : null,
          waLabel2: waConfig.waLabel2 || "Nomor CS & Pengaduan",
          adminPhone: waConfig.adminPhone ? String(waConfig.adminPhone).trim() : null,
          ownerPhone: waConfig.ownerPhone ? String(waConfig.ownerPhone).trim() : null,
          waGroupTagihan: waConfig.waGroupTagihan ? String(waConfig.waGroupTagihan).trim() : null,
          waGroupPengaduan: waConfig.waGroupPengaduan ? String(waConfig.waGroupPengaduan).trim() : null,
          blastDelayMs: Number(waConfig.blastDelayMs) || 1500,
          autoSendEnabled: waConfig.autoSendEnabled !== undefined ? Boolean(waConfig.autoSendEnabled) : true,
        },
        create: {
          tenantId: tenant.id,
          gatewayMode: waConfig.gatewayMode || "dedicated_mitra",
          provider: waConfig.provider || "fonnte",
          waNumber1: waConfig.waNumber1 ? String(waConfig.waNumber1).trim() : null,
          waApiKey1: waConfig.waApiKey1 ? String(waConfig.waApiKey1).trim() : null,
          waLabel1: waConfig.waLabel1 || "Nomor Utama (Bot & Tagihan)",
          waNumber2: waConfig.waNumber2 ? String(waConfig.waNumber2).trim() : null,
          waApiKey2: waConfig.waApiKey2 ? String(waConfig.waApiKey2).trim() : null,
          waLabel2: waConfig.waLabel2 || "Nomor CS & Pengaduan",
          adminPhone: waConfig.adminPhone ? String(waConfig.adminPhone).trim() : null,
          ownerPhone: waConfig.ownerPhone ? String(waConfig.ownerPhone).trim() : null,
          waGroupTagihan: waConfig.waGroupTagihan ? String(waConfig.waGroupTagihan).trim() : null,
          waGroupPengaduan: waConfig.waGroupPengaduan ? String(waConfig.waGroupPengaduan).trim() : null,
          blastDelayMs: Number(waConfig.blastDelayMs) || 1500,
          autoSendEnabled: true,
        },
      });
    }

    // 2. Perbarui Quota Usage & Overage Billing
    if (quotaUsage) {
      await prisma.tenantQuotaUsage.upsert({
        where: { tenantId: tenant.id },
        update: {
          kuotaBulanan: Number(quotaUsage.kuotaBulanan) || 1000,
          kuotaTopup: Number(quotaUsage.kuotaTopup) || 0,
          biayaPerPesanOverage: Number(quotaUsage.biayaPerPesanOverage) || 150,
        },
        create: {
          tenantId: tenant.id,
          kuotaBulanan: Number(quotaUsage.kuotaBulanan) || 1000,
          kuotaTopup: Number(quotaUsage.kuotaTopup) || 0,
          biayaPerPesanOverage: Number(quotaUsage.biayaPerPesanOverage) || 150,
          periodeMulai: new Date(),
          periodeBerakhir: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // 3. Perbarui Payment Gateway & Komisi O2W HERO
    if (paymentConfig) {
      await prisma.tenantPaymentConfig.upsert({
        where: { tenantId: tenant.id },
        update: {
          gatewayMode: paymentConfig.gatewayMode || "centralized_pool",
          merchantCode: paymentConfig.merchantCode ? String(paymentConfig.merchantCode).trim() : null,
          apiKey: paymentConfig.apiKey ? String(paymentConfig.apiKey).trim() : null,
          feeBearerPolicy: paymentConfig.feeBearerPolicy || "hybrid",
          adminFeeQris: Number(paymentConfig.adminFeeQris) || 1500,
          adminFeeVa: Number(paymentConfig.adminFeeVa) || 3500,
          adminFeeEwallet: Number(paymentConfig.adminFeeEwallet) || 2000,
          platformFeeNominal: Number(paymentConfig.platformFeeNominal) || 1000,
          platformFeeRate: Number(paymentConfig.platformFeeRate) || 0,
          bankName: paymentConfig.bankName ? String(paymentConfig.bankName).trim() : null,
          bankAccountNumber: paymentConfig.bankAccountNumber ? String(paymentConfig.bankAccountNumber).trim() : null,
          bankAccountHolder: paymentConfig.bankAccountHolder ? String(paymentConfig.bankAccountHolder).trim() : null,
          payoutSchedule: paymentConfig.payoutSchedule || "weekly",
        },
        create: {
          tenantId: tenant.id,
          gatewayMode: paymentConfig.gatewayMode || "centralized_pool",
          merchantCode: paymentConfig.merchantCode ? String(paymentConfig.merchantCode).trim() : null,
          apiKey: paymentConfig.apiKey ? String(paymentConfig.apiKey).trim() : null,
          feeBearerPolicy: paymentConfig.feeBearerPolicy || "hybrid",
          adminFeeQris: Number(paymentConfig.adminFeeQris) || 1500,
          adminFeeVa: Number(paymentConfig.adminFeeVa) || 3500,
          adminFeeEwallet: Number(paymentConfig.adminFeeEwallet) || 2000,
          platformFeeNominal: Number(paymentConfig.platformFeeNominal) || 1000,
          platformFeeRate: Number(paymentConfig.platformFeeRate) || 0,
          bankName: paymentConfig.bankName ? String(paymentConfig.bankName).trim() : null,
          bankAccountNumber: paymentConfig.bankAccountNumber ? String(paymentConfig.bankAccountNumber).trim() : null,
          bankAccountHolder: paymentConfig.bankAccountHolder ? String(paymentConfig.bankAccountHolder).trim() : null,
          payoutSchedule: paymentConfig.payoutSchedule || "weekly",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Pengaturan WhatsApp & Payment Gateway untuk ${tenant.namaMitra} berhasil disimpan!`,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Tenant Settings Update API] Error:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan tenant: " + error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
