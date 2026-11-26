/**
 * Single source of truth for O2W HERO SaaS subscription plans & commission tiers.
 * Shared across O2WHeroCorePortal marketing, Control Tower analytics, and SaaS Billing.
 */

export interface SaasPlanDefinition {
  id: "starter" | "pro" | "enterprise" | "government" | "percontohan";
  name: string;
  marketingLabel: string;
  target: string;
  priceMonthly: number;
  priceFormatted: string;
  commissionRate: number;
  commissionLabel: string;
  waQuota: number;
  wargaMax: string;
  dbType: string;
  recommended?: boolean;
  features: string[];
}

export const SAAS_PLANS: SaasPlanDefinition[] = [
  {
    id: "starter",
    name: "Starter",
    marketingLabel: "Paket Starter",
    target: "Bank Sampah & TPS3R Pemula (<= 300 KK)",
    priceMonthly: 349000,
    priceFormatted: "Rp 349 rb / bln",
    commissionRate: 0,
    commissionLabel: "Tanpa Komisi",
    waQuota: 1000,
    wargaMax: "Hingga 300–500 KK",
    dbType: "Multi-Tenant Shared Schema",
    features: [
      "Pencatatan tabungan sampah & iuran digital",
      "Kuitansi & laporan timbangan WhatsApp",
      "Subdomain: namapengelola.o2whero.com",
      "1 Nomor WhatsApp Bot Notifikasi",
      "Support chat jam kerja",
    ],
  },
  {
    id: "pro",
    name: "Kemitraan All-in-One",
    marketingLabel: "Kemitraan All-in-One",
    target: "TPS 3R & BUMDes Aktif (Rujukan: UPS HERU)",
    priceMonthly: 2000000,
    priceFormatted: "Rp 2 Jt / bln + 10% Komisi",
    commissionRate: 0.1,
    commissionLabel: "10% Komisi Iuran",
    waQuota: 5000,
    wargaMax: "Hingga 3.000+ KK",
    dbType: "Dedicated Tenant Database (Isolasi Penuh)",
    recommended: true,
    features: [
      "Semua fitur paket Starter",
      "Manajemen retribusi bulanan & penagihan otomatis",
      "Dual WhatsApp (Bot Tagihan + Nomor CS Warga)",
      "Pelacakan GPS armada truk & aplikasi driver Android",
      "Payment gateway QRIS & VA otomatis lunas",
      "Dukungan custom domain sendiri (misal: upsheru.com)",
      "Pendampingan operasional & prioritas 7x24 jam",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    marketingLabel: "Enterprise / Kawasan",
    target: "DLH Kota, Kawasan Industri & Real Estate",
    priceMonthly: 4990000,
    priceFormatted: "Rp 4,99 Jt / bln",
    commissionRate: 0,
    commissionLabel: "Custom SLA",
    waQuota: 20000,
    wargaMax: "Tanpa Batas KK",
    dbType: "Dedicated Cluster DB + High Availability",
    features: [
      "Semua fitur paket Kemitraan All-in-One",
      "Multi-Armada & Multi-Zona Tanpa Batas",
      "Integrasi timbangan digital bridge API",
      "Marketplace agregasi material off-taker",
      "Dedicated Account Manager & SLA 99.9%",
      "Custom SLA & Integrasi ERP Korporat",
    ],
  },
  {
    id: "government",
    name: "Government / DLH",
    marketingLabel: "Government / DLH",
    target: "Dinas Lingkungan Hidup Kab / Kota",
    priceMonthly: 0,
    priceFormatted: "Kontrak Tahunan APBD",
    commissionRate: 0,
    commissionLabel: "Kontrak APBD",
    waQuota: 50000,
    wargaMax: "Skala Kota / Kabupaten",
    dbType: "Gov-Cloud Dedicated Instance",
    features: [
      "Dashboard agregat seluruh TPS 3R kota",
      "Integrasi sinkronisasi data SIPSN KLHK",
      "Pelaporan otomatis reduksi karbon & tonase TPA",
      "Pelatihan petugas DLH & pendampingan lapangan",
      "Perjanjian Kerjasama Resmi Pemda",
    ],
  },
];

export const SAAS_TIER_RATES: Record<string, number> = {
  starter: 349000,
  basic: 349000,
  pro: 2000000,
  kemitraan: 2000000,
  enterprise: 4990000,
  percontohan: 0,
};

export function getSaasPlanMonthlyPrice(planId?: string | null): number {
  if (!planId) return 0;
  return SAAS_TIER_RATES[planId.trim().toLowerCase()] ?? 349000;
}
