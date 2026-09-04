/**
 * Data channel pembayaran Duitku — murni (tanpa import server-only),
 * aman dipakai dari komponen client ("use client").
 */

/**
 * Channel yang benar-benar aktif untuk merchant ini (terverifikasi via
 * inquiry langsung ke Duitku). Sandbox Duitku mengembalikan banyak channel
 * "enabled" di getPaymentMethod padahal inquiry-nya ditolak (HTTP 404
 * "Payment channel not available") — menampilkannya semua hanya bikin user
 * gagal bayar di channel yang tidak tersedia.
 *
 * Default: VA (Virtual Account/MAYBANK), BT (Bank Transfer), VC (Kartu
 * Kredit) — terverifikasi jalan di merchant DS33858 (sandbox).
 * Override: env DUITKU_CHANNELS="VA,BT,VC,..." (comma, uppercase) saat
 * channel baru diaktifkan di dashboard Duitku (sandbox/production).
 */
export function channelAllowed(paymentMethod?: string | null): boolean {
  const m = (paymentMethod || "").toUpperCase();
  if (!m) return false;
  const env = process.env.DUITKU_CHANNELS?.trim();
  const allowed = env
    ? env.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : ["VA", "BT", "BC", "M2", "I1", "B1", "A1", "VC", "OV", "SP", "DA"];
  return allowed.includes(m);
}

/** Label Indonesia untuk channel pembayaran Duitku. */
export function duitkuChannelLabel(paymentMethod?: string | null): string {
  const map: Record<string, string> = {
    VC: "Virtual Account",
    VA: "Virtual Account",
    QR: "QRIS",
    SP: "ShopeePay",
    OVO: "OVO",
    DANA: "DANA",
    M1: "Mandiri Bill",
    BT: "Bank Transfer",
    CIMB: "Virtual Account CIMB",
    BNI: "Virtual Account BNI",
    BRI: "Virtual Account BRI",
    PERMATA: "Virtual Account Permata",
    MANDIRI: "Virtual Account Mandiri",
    GOPAY: "GoPay",
    LINK_AJA: "LinkAja",
    SA: "Salam Super App",
    CREDIT_CARD: "Kartu Kredit",
  };
  return map[paymentMethod || ""] || (paymentMethod ? paymentMethod : "Payment Gateway");
}

export type DuitkuPaymentMethod = {
  paymentMethod: string;
  paymentName: string;
  paymentImage?: string;
  totalFee?: string;
};

/**
 * Daftar channel pembayaran default (fallback) — dipakai jika getPaymentMethods
 * belum aktif/gagal. id dipakai sebagai paymentMethod Duitku.
 */
// Fallback saat getPaymentMethods gagal — hanya channel yang benar-benar
// tersedia (lihat channelAllowed); jangan tampilkan channel yang pasti gagal.
export const DUITKU_METHODS = [
  { value: "VA", label: "Maybank Virtual Account", icon: "🏦" },
  { value: "BT", label: "Permata Virtual Account", icon: "🏦" },
  { value: "BC", label: "BCA Virtual Account", icon: "🏦" },
  { value: "M2", label: "Mandiri Virtual Account", icon: "🏦" },
  { value: "I1", label: "BNI Virtual Account", icon: "🏦" },
  { value: "B1", label: "CIMB Virtual Account", icon: "🏦" },
  { value: "A1", label: "ATM Bersama", icon: "🏦" },
  { value: "VC", label: "Kartu Kredit", icon: "💳" },
  { value: "OV", label: "OVO", icon: "💜" },
  { value: "SP", label: "Shopee Pay", icon: "🛍️" },
  { value: "DA", label: "DANA", icon: "🔵" },
];
