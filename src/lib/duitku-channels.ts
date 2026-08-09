/**
 * Data channel pembayaran Duitku — murni (tanpa import server-only),
 * aman dipakai dari komponen client ("use client").
 */

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
export const DUITKU_METHODS = [
  { value: "VC", label: "Virtual Account", icon: "🏦" },
  { value: "QR", label: "QRIS", icon: "📱" },
  { value: "SP", label: "ShopeePay", icon: "🛍️" },
  { value: "OVO", label: "OVO", icon: "💜" },
  { value: "DANA", label: "DANA", icon: "🔵" },
  { value: "M1", label: "Mandiri Bill", icon: "🏛️" },
  { value: "CIMB", label: "VA CIMB Niaga", icon: "🏛️" },
  { value: "BNI", label: "VA BNI", icon: "🏛️" },
  { value: "BRI", label: "VA BRI", icon: "🏛️" },
  { value: "PERMATA", label: "VA Permata", icon: "🏛️" },
  { value: "GOPAY", label: "GoPay", icon: "🟢" },
  { value: "LINK_AJA", label: "LinkAja", icon: "🟠" },
];
