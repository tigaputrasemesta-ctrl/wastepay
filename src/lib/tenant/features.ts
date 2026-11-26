/**
 * Tenant Feature Flags & Module Configuration Engine
 * Mengatur modul yang aktif/nonaktif per tenant pada arsitektur 1 VPS + 1 Database.
 */

export type CoreFeatureKey =
  | "dashboard"
  | "pelanggan"
  | "tagihan"
  | "bayar"
  | "pengangkutan"
  | "petugas"
  | "kendaraan"
  | "laporan"
  | "pengaturan";

export type OptionalFeatureKey =
  | "marketplace"
  | "artikel"
  | "ai_command"
  | "pickup_incidental"
  | "sticker"
  | "transit_tpa"
  | "chat_internal"
  | "absensi_klaim";

export type TenantFeatureKey = CoreFeatureKey | OptionalFeatureKey;

export const CORE_FEATURES: CoreFeatureKey[] = [
  "dashboard",
  "pelanggan",
  "tagihan",
  "bayar",
  "pengangkutan",
  "petugas",
  "kendaraan",
  "laporan",
  "pengaturan",
];

export const OPTIONAL_FEATURES: OptionalFeatureKey[] = [
  "marketplace",
  "artikel",
  "ai_command",
  "pickup_incidental",
  "sticker",
  "transit_tpa",
  "chat_internal",
  "absensi_klaim",
];

export interface FeatureMetadata {
  key: TenantFeatureKey;
  label: string;
  description: string;
  category: "core" | "operasional" | "tambahan";
  defaultEnabled: boolean;
}

export const FEATURE_METADATA: Record<TenantFeatureKey, FeatureMetadata> = {
  dashboard: {
    key: "dashboard",
    label: "Dashboard & Ringkasan",
    description: "Statistik warga, ringkasan tagihan, dan ritase harian",
    category: "core",
    defaultEnabled: true,
  },
  pelanggan: {
    key: "pelanggan",
    label: "Pusat Data Pelanggan",
    description: "Database warga/nasabah, zonasi, dan rute pelayanan",
    category: "core",
    defaultEnabled: true,
  },
  tagihan: {
    key: "tagihan",
    label: "Tagihan Retribusi & Iuran",
    description: "Penetapan iuran, blast WhatsApp tagihan, dan invoice",
    category: "core",
    defaultEnabled: true,
  },
  bayar: {
    key: "bayar",
    label: "Kasir & Pembayaran QRIS",
    description: "Pencatatan kasir, kuitansi digital, dan gateway Duitku QRIS",
    category: "core",
    defaultEnabled: true,
  },
  pengangkutan: {
    key: "pengangkutan",
    label: "Log Ritase & Pengangkutan",
    description: "Pencatatan checklist angkut sampah harian per rumah",
    category: "core",
    defaultEnabled: true,
  },
  petugas: {
    key: "petugas",
    label: "Manajemen Tim Petugas",
    description: "Daftar supir, kernet, staf kasir, dan penugasan armada",
    category: "core",
    defaultEnabled: true,
  },
  kendaraan: {
    key: "kendaraan",
    label: "Armada Kendaraan",
    description: "Data armada truk sampah, gerobak motor, dan kapasitas",
    category: "core",
    defaultEnabled: true,
  },
  laporan: {
    key: "laporan",
    label: "Laporan Keuangan & Operasional",
    description: "Laporan kas bulanan, buku kas, dan cetak PDF/Excel",
    category: "core",
    defaultEnabled: true,
  },
  pengaturan: {
    key: "pengaturan",
    label: "Pengaturan Tenant",
    description: "Konfigurasi profil, pesan WhatsApp, dan akun staf",
    category: "core",
    defaultEnabled: true,
  },
  marketplace: {
    key: "marketplace",
    label: "Katalog & Toko Kompos",
    description: "Jual beli pupuk kompos organik, maggot, dan merchandise",
    category: "tambahan",
    defaultEnabled: false,
  },
  artikel: {
    key: "artikel",
    label: "Edukasi & CMS Artikel",
    description: "Publikasi berita pemilahan sampah dan artikel edukasi",
    category: "tambahan",
    defaultEnabled: false,
  },
  ai_command: {
    key: "ai_command",
    label: "AI Command Hub & Approval",
    description: "Asisten AI cerdas untuk pemrosesan tiket dan analisa rute",
    category: "tambahan",
    defaultEnabled: false,
  },
  pickup_incidental: {
    key: "pickup_incidental",
    label: "Jemput Sampah Insidental",
    description: "Order jemput sampah besar (sofa, kasur, puing) on-demand",
    category: "operasional",
    defaultEnabled: false,
  },
  sticker: {
    key: "sticker",
    label: "Cetak Barcode QR Pelanggan",
    description: "Modul cetak stiker nomor rumah & barcode QR tempel",
    category: "operasional",
    defaultEnabled: false,
  },
  transit_tpa: {
    key: "transit_tpa",
    label: "Titik Transit & Manifest TPA",
    description: "Pencatatan timbangan sampah di depo transit dan manifest TPA",
    category: "operasional",
    defaultEnabled: false,
  },
  chat_internal: {
    key: "chat_internal",
    label: "Chat Koordinasi Lapangan",
    description: "Komunikasi real-time pesan singkat admin dan supir",
    category: "operasional",
    defaultEnabled: false,
  },
  absensi_klaim: {
    key: "absensi_klaim",
    label: "Presensi GPS & Klaim Petugas",
    description: "Absen masuk/pulang supir dengan foto & reimbursement bensin",
    category: "operasional",
    defaultEnabled: false,
  },
};

/**
 * Parsing array atau string JSON fiturAktif dari database/config
 */
export function parseTenantFeatures(fiturAktif?: string | string[] | null): Set<string> {
  const result = new Set<string>(CORE_FEATURES);
  if (!fiturAktif) return result;

  if (Array.isArray(fiturAktif)) {
    for (const item of fiturAktif) {
      if (typeof item === "string" && item.trim()) {
        result.add(item.trim());
      }
    }
    return result;
  }

  if (typeof fiturAktif === "string") {
    try {
      const parsed = JSON.parse(fiturAktif);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (typeof item === "string" && item.trim()) {
            result.add(item.trim());
          }
        }
      }
    } catch {
      // Jika comma-separated
      const parts = fiturAktif.split(",").map((s) => s.trim()).filter(Boolean);
      for (const p of parts) {
        result.add(p);
      }
    }
  }

  return result;
}

/**
 * Serialize fitur array ke JSON string untuk penyimpanan database
 */
export function serializeTenantFeatures(features: string[]): string {
  const unique = Array.from(new Set([...CORE_FEATURES, ...features]));
  return JSON.stringify(unique);
}

/**
 * Evaluasi apakah sebuah fitur aktif pada tenant tertentu
 */
export function isFeatureEnabled(
  tenant:
    | {
        id?: string | null;
        slug?: string | null;
        fiturAktif?: string | string[] | null;
        tipe?: string | null;
      }
    | null
    | undefined,
  featureKey: TenantFeatureKey
): boolean {
  // Fitur inti selalu aktif pada semua tenant tanpa terkecuali
  if ((CORE_FEATURES as readonly string[]).includes(featureKey)) {
    return true;
  }

  // Tenant Pilot UPS HERU mengaktifkan semua modul (Pilot Showcase)
  if (
    tenant?.id === "tenant-pilot-upsheru" ||
    tenant?.slug === "upsheru" ||
    tenant?.tipe === "mitra_percontohan"
  ) {
    return true;
  }

  // Core Platform SaaS
  if (
    tenant?.id === "tenant-core-o2w" ||
    tenant?.slug === "o2w-core" ||
    tenant?.tipe === "core"
  ) {
    return true;
  }

  if (!tenant) return false;

  const enabledSet = parseTenantFeatures(tenant.fiturAktif);
  return enabledSet.has(featureKey);
}
