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

const TIER_PRICES: Record<string, number> = {
  starter: 349000,
  basic: 349000,
  pro: 1250000,
  enterprise: 2990000,
  percontohan: 0,
};

export interface TenantCommissionReportItem {
  tenantId: string;
  slug: string;
  namaMitra: string;
  primaryDomain: string;
  tipePengelola: string;
  status: string;
  kota: string;
  wargaCount: number;
  planName: string;
  priceMonthly: number;
  domainSetupFee: number;
  setupFeePaid: boolean;
  platformFeeNominal: number;
  platformFeeRate: number;
  gatewayMode: string;
  txCount: number;
  grossGmv: number;
  commissionO2w: number;
  gatewayFee: number;
  netMitra: number;
  payoutPaid: number;
  pendingEscrow: number;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  payoutSchedule: string;
  createdAt: string;
}

/**
 * GET /api/core/subscriptions/reports
 * Mengembalikan laporan lengkap langganan & komisi per tenant (O2W HERO Core Superadmin)
 */
export async function GET(request: Request) {
  const corsHeaders = buildCorsHeaders(request);

  try {
    const session = await getSession();
    if (!session || (session.role !== "superadmin" && session.role !== "admin")) {
      return NextResponse.json(
        { error: "Akses ditolak: Hanya Superadmin atau Admin Platform yang dapat melihat laporan komisi." },
        { status: 403, headers: corsHeaders }
      );
    }

    // 1. Ambil seluruh data tenant beserta relasi konfigurasi
    const tenants = await prisma.tenant.findMany({
      include: {
        domains: true,
        subscriptions: { orderBy: { createdAt: "desc" }, take: 1 },
        paymentConfig: true,
        quotaUsage: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Ambil data agregasi keuangan & operasional secara paralel
    const [ledgers, payouts, pembayarans, pelangganCounts] = await Promise.all([
      // Ambil transaksi ledger untuk menghitung komisi riil
      prisma.tenantLedger.findMany({
        select: {
          tenantId: true,
          tipe: true,
          nominalGross: true,
          feePlatform: true,
          feeGateway: true,
          nominalNet: true,
        },
      }).catch(() => []),

      // Ambil pencairan dana (payout)
      prisma.tenantPayout.findMany({
        where: { status: "berhasil" },
        select: {
          tenantId: true,
          totalNominal: true,
        },
      }).catch(() => []),

      // Ambil pembayaran terverifikasi untuk GMV
      prisma.pembayaran.findMany({
        where: { status: "terverifikasi" },
        select: {
          tenantId: true,
          jumlah: true,
        },
      }).catch(() => []),

      // Jumlah warga aktif per tenant
      prisma.pelanggan.groupBy({
        by: ["tenantId"],
        where: { deletedAt: null },
        _count: true,
      }).catch(() => []),
    ]);

    // Peta pembantu
    const ledgerMap = new Map<string, { gross: number; feePlatform: number; feeGateway: number; net: number; count: number }>();
    for (const l of ledgers) {
      if (!l.tenantId) continue;
      const cur = ledgerMap.get(l.tenantId) || { gross: 0, feePlatform: 0, feeGateway: 0, net: 0, count: 0 };
      if (l.tipe === "CREDIT_PAYMENT") {
        cur.gross += Number(l.nominalGross || 0);
        cur.feePlatform += Number(l.feePlatform || 0);
        cur.feeGateway += Number(l.feeGateway || 0);
        cur.net += Number(l.nominalNet || 0);
        cur.count += 1;
      }
      ledgerMap.set(l.tenantId, cur);
    }

    const payoutMap = new Map<string, number>();
    for (const p of payouts) {
      if (!p.tenantId) continue;
      payoutMap.set(p.tenantId, (payoutMap.get(p.tenantId) || 0) + Number(p.totalNominal || 0));
    }

    const pembayaranMap = new Map<string, { total: number; count: number }>();
    for (const pb of pembayarans) {
      const tId = pb.tenantId || "tenant-pilot-upsheru";
      const cur = pembayaranMap.get(tId) || { total: 0, count: 0 };
      cur.total += Number(pb.jumlah || 0);
      cur.count += 1;
      pembayaranMap.set(tId, cur);
    }

    const wargaMap = new Map<string, number>();
    for (const pc of pelangganCounts) {
      const tId = pc.tenantId || "tenant-pilot-upsheru";
      wargaMap.set(tId, pc._count);
    }

    // 3. Susun laporan per tenant
    const reports: TenantCommissionReportItem[] = [];
    let grandTotalGmv = 0;
    let grandTotalCommissionO2w = 0;
    let grandTotalSubscriptionMrr = 0;
    let grandTotalSetupFeeIncome = 0;
    let grandTotalNetMitra = 0;
    let grandTotalPayoutPaid = 0;
    let grandTotalPendingEscrow = 0;

    for (const t of tenants) {
      const sub = t.subscriptions[0];
      const payCfg = t.paymentConfig;

      const planKey = (sub?.planName || t.paketLangganan || "basic").toLowerCase();
      const priceMonthly = TIER_PRICES[planKey] ?? 0;
      const domainSetupFee = sub?.domainSetupFee ?? (t.slug === "core" ? 0 : 2000000);
      const setupFeePaid = sub?.setupFeePaid ?? (t.slug === "upsheru" || t.slug === "core");

      const platformFeeNominal = payCfg?.platformFeeNominal ?? 1000;
      const platformFeeRate = payCfg?.platformFeeRate ?? 0;
      const gatewayMode = payCfg?.gatewayMode || "centralized_pool";

      const primaryDomain =
        t.customDomain ||
        (t.domains.find((d) => d.isPrimary)?.domain) ||
        t.subdomain ||
        `${t.slug}.o2whero.com`;

      // Hitung metrik keuangan dari ledger atau pembayaran riil
      const lData = ledgerMap.get(t.id);
      const pbData = pembayaranMap.get(t.id) || (t.slug === "upsheru" ? pembayaranMap.get("tenant-pilot-upsheru") : undefined);

      let txCount = lData?.count || pbData?.count || 0;
      let grossGmv = lData?.gross || pbData?.total || 0;
      
      let commissionO2w = lData?.feePlatform ?? 0;
      if (commissionO2w === 0 && txCount > 0) {
        commissionO2w = (txCount * platformFeeNominal) + (grossGmv * (platformFeeRate / 100));
      }

      let gatewayFee = lData?.feeGateway ?? (txCount * 1500);
      let netMitra = lData?.net ?? Math.max(0, grossGmv - commissionO2w - gatewayFee);
      let payoutPaid = payoutMap.get(t.id) || 0;
      let pendingEscrow = Math.max(0, netMitra - payoutPaid);

      const wargaCount = wargaMap.get(t.id) || (t.slug === "upsheru" ? (wargaMap.get("tenant-pilot-upsheru") || 0) : 0);

      // Akumulasi ringkasan ekosistem
      grandTotalGmv += grossGmv;
      grandTotalCommissionO2w += commissionO2w;
      grandTotalSubscriptionMrr += (t.status === "aktif" ? priceMonthly : 0);
      grandTotalSetupFeeIncome += (setupFeePaid ? domainSetupFee : 0);
      grandTotalNetMitra += netMitra;
      grandTotalPayoutPaid += payoutPaid;
      grandTotalPendingEscrow += pendingEscrow;

      reports.push({
        tenantId: t.id,
        slug: t.slug,
        namaMitra: t.namaMitra,
        primaryDomain,
        tipePengelola: t.tipePengelola,
        status: t.status,
        kota: t.kota || "Kota Depok",
        wargaCount,
        planName: planKey,
        priceMonthly,
        domainSetupFee,
        setupFeePaid,
        platformFeeNominal,
        platformFeeRate,
        gatewayMode,
        txCount,
        grossGmv,
        commissionO2w,
        gatewayFee,
        netMitra,
        payoutPaid,
        pendingEscrow,
        bankName: payCfg?.bankName || "-",
        bankAccountNumber: payCfg?.bankAccountNumber || "-",
        bankAccountHolder: payCfg?.bankAccountHolder || "-",
        payoutSchedule: payCfg?.payoutSchedule || "weekly",
        createdAt: t.createdAt.toISOString(),
      });
    }

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalTenants: tenants.length,
          totalGmv: grandTotalGmv,
          totalCommissionO2w: grandTotalCommissionO2w,
          totalSubscriptionMrr: grandTotalSubscriptionMrr,
          totalSetupFeeIncome: grandTotalSetupFeeIncome,
          totalNetMitra: grandTotalNetMitra,
          totalPayoutPaid: grandTotalPayoutPaid,
          totalPendingEscrow: grandTotalPendingEscrow,
        },
        reports,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Subscription Commission Report API] Error:", error);
    return NextResponse.json(
      { error: "Gagal menyusun laporan komisi tenant: " + (error?.message || "Internal error") },
      { status: 500, headers: corsHeaders }
    );
  }
}
