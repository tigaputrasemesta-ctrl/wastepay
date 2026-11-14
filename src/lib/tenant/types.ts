/**
 * Definisi Type & Interface untuk Sistem Multi-Tenant O2W Hero Core & Mitra Pengelola Sampah
 */

export interface TenantBranding {
  namaMitra: string;
  tagline: string;
  logoUrl?: string;
  warnaTema?: string;
  alamat?: string;
  kota?: string;
  emailKontak?: string;
  whatsappKontak?: string;
  nomorPengaduan?: string;
}

export interface TenantWaConfig {
  apiKey?: string;
  apiUrl?: string;
  adminPhone?: string;
  ownerPhone?: string;
  pengaduanPhone?: string;
}

export interface TenantDbConfig {
  connectionString?: string;
  schemaName?: string;
  isDedicated: boolean;
}

export interface TenantConfig {
  id: string;
  slug: string; // e.g. "upsheru", "o2w-core"
  namaMitra: string;
  tipe: "core" | "mitra_percontohan" | "mitra_mandiri";
  domains: string[]; // e.g. ["upsheru.com", "www.upsheru.com", "upsheru.o2whero.com"]
  primaryDomain: string;
  branding: TenantBranding;
  waConfig?: TenantWaConfig;
  dbConfig: TenantDbConfig;
  status: "aktif" | "suspend" | "maintenance";
  fitur: {
    retribusiSampah: boolean;
    tabunganSampah: boolean;
    jemputSampah: boolean;
    jualOfftaker: boolean;
    qrisDuitku: boolean;
    whatsappNotif: boolean;
  };
}

export interface TenantContext {
  tenant: TenantConfig;
  isCore: boolean;
  isPilot: boolean;
  currentHost: string;
  baseUrl: string;
}
