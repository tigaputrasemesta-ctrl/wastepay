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
  
  // Hanya menghilangkan opsi "QR" (QRIS Nasional), biarkan NusaPay (SQ) dan ShopeePay (SP)
  if (m === "QR") return false;

  const env = process.env.DUITKU_CHANNELS?.trim();
  const allowed = env
    ? env.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : ["SP", "SQ"];
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
    SQ: "NusaPay QRIS",
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
export const DUITKU_METHODS: any[] = [
  { value: "SP", label: "ShopeePay", icon: "📱", imageUrl: "https://images.duitku.com/hotlink-ok/SP.PNG", totalFee: "1000" },
  { value: "SQ", label: "NusaPay QRIS", icon: "📱", imageUrl: "https://images.duitku.com/hotlink-ok/SQ.PNG", totalFee: "1000" },
];
