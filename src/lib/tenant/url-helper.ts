import { resolveTenantByHost } from "./config";
import { TenantConfig } from "./types";

/**
 * Mendapatkan Base URL aplikasi berdasarkan host request atau default pilot tenant
 */
export function getTenantAppUrl(host?: string | null): string {
  const context = resolveTenantByHost(host);
  return context.baseUrl;
}

/**
 * Mendapatkan Nama Mitra/Pengelola Sampah
 */
export function getTenantName(host?: string | null): string {
  const context = resolveTenantByHost(host);
  return context.tenant.branding.namaMitra;
}

/**
 * Mendapatkan Tagline Mitra
 */
export function getTenantTagline(host?: string | null): string {
  const context = resolveTenantByHost(host);
  return context.tenant.branding.tagline;
}

/**
 * Mendapatkan Nomor WhatsApp Kontak/Admin
 */
export function getTenantSupportPhone(host?: string | null): string {
  const context = resolveTenantByHost(host);
  return context.tenant.branding.whatsappKontak || "+62 814-0078-2617";
}

/**
 * Mendapatkan Nomor WhatsApp Petugas Pengaduan
 */
export function getTenantPengaduanPhone(host?: string | null): string {
  const context = resolveTenantByHost(host);
  return context.tenant.branding.nomorPengaduan || "0895385058054";
}

/**
 * Mendapatkan Email Kontak
 */
export function getTenantEmail(host?: string | null): string {
  const context = resolveTenantByHost(host);
  return context.tenant.branding.emailKontak || "kontak@upsheru.com";
}

/**
 * Link Portal Pembayaran
 */
export function getTenantBayarUrl(host?: string | null, invoiceNo?: string): string {
  const baseUrl = getTenantAppUrl(host);
  if (invoiceNo) {
    return `${baseUrl}/bayar?invoice=${encodeURIComponent(invoiceNo)}`;
  }
  return `${baseUrl}/bayar`;
}

/**
 * Link Cetak/Detail Faktur Tagihan
 */
export function getTenantInvoiceUrl(invoiceNo: string, host?: string | null): string {
  const baseUrl = getTenantAppUrl(host);
  return `${baseUrl}/invoice-tagihan?invoice=${encodeURIComponent(invoiceNo)}`;
}

/**
 * Link Pengaduan Sampah
 */
export function getTenantPengaduanUrl(host?: string | null): string {
  const baseUrl = getTenantAppUrl(host);
  return `${baseUrl}/pengaduan`;
}

/**
 * Link Pendaftaran Baru
 */
export function getTenantDaftarUrl(host?: string | null, ref?: string): string {
  const baseUrl = getTenantAppUrl(host);
  if (ref) {
    return `${baseUrl}/daftar?ref=${encodeURIComponent(ref)}`;
  }
  return `${baseUrl}/daftar`;
}
