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
  
  // Nonaktifkan QR legacy
  if (m === "QR") return false;

  const env = process.env.DUITKU_CHANNELS?.trim();
  const allowed = env
    ? env.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : [
        "SQ", "SP", "BC", "M1", "I1", "BR", "BT", "B1", "VA", "VC",
        "CIMB", "BNI", "BRI", "PERMATA", "MANDIRI", "OVO", "DANA", "GOPAY"
      ];
  return allowed.includes(m);
}

/** Label Indonesia untuk channel pembayaran Duitku. */
export function duitkuChannelLabel(paymentMethod?: string | null): string {
  const map: Record<string, string> = {
    BC: "Virtual Account BCA",
    M1: "Mandiri Bill",
    I1: "Virtual Account BNI",
    BR: "Virtual Account BRI",
    B1: "Virtual Account CIMB",
    BT: "Permata / Bank Transfer",
    VC: "Virtual Account",
    VA: "Virtual Account",
    QR: "QRIS",
    SP: "ShopeePay",
    SQ: "QRIS NusaPay",
    OVO: "OVO",
    DANA: "DANA",
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
export const DUITKU_METHODS: any[] = [
  {
    value: "SQ",
    label: "QRIS NusaPay",
    sublabel: "BCA, Mandiri, BRI, BNI, DANA, GoPay, OVO, ShopeePay",
    icon: "💳",
    imageUrl: "https://images.duitku.com/hotlink-ok/SQ.PNG",
    totalFee: "1500"
  },
  {
    value: "SP",
    label: "ShopeePay",
    sublabel: "Aplikasi Shopee & ShopeePay",
    icon: "🛍️",
    imageUrl: "https://images.duitku.com/hotlink-ok/SP.PNG",
    totalFee: "1500"
  },
  {
    value: "BC",
    label: "Virtual Account BCA",
    sublabel: "BCA Mobile, myBCA, KlikBCA & ATM BCA",
    icon: "🏦",
    imageUrl: "https://images.duitku.com/hotlink-ok/BC.PNG",
    totalFee: "3000"
  },
  {
    value: "M1",
    label: "Mandiri Bill",
    sublabel: "Livin' by Mandiri & ATM Mandiri",
    icon: "🏦",
    imageUrl: "https://images.duitku.com/hotlink-ok/M1.PNG",
    totalFee: "3000"
  },
  {
    value: "I1",
    label: "Virtual Account BNI",
    sublabel: "BNI Mobile Banking & ATM BNI",
    icon: "🏦",
    imageUrl: "https://images.duitku.com/hotlink-ok/I1.PNG",
    totalFee: "3000"
  },
  {
    value: "BR",
    label: "Virtual Account BRI",
    sublabel: "BRImo & ATM BRI",
    icon: "🏦",
    imageUrl: "https://images.duitku.com/hotlink-ok/BR.PNG",
    totalFee: "3000"
  },
  {
    value: "BT",
    label: "Permata / Bank Transfer",
    sublabel: "PermataMobile X & ATM Bersama/Prima",
    icon: "🏦",
    imageUrl: "https://images.duitku.com/hotlink-ok/BT.PNG",
    totalFee: "3000"
  },
];
