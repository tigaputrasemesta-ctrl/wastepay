/**
 * Integrasi Duitku Payment Gateway — disesuaikan dengan dokumentasi resmi.
 * Referensi: https://docs.duitku.com/api/id/
 *
 * Alur:
 *   1. Pelanggan pilih metode bayar (paymentMethod, mis. "VC", "QR", "OVO").
 *   2. POST /api/publik/duitku/transaction → createPayment → paymentUrl.
 *   3. Redirect pelanggan ke paymentUrl (halaman pembayaran Duitku).
 *   4. Duitku kirim callback → diverifikasi signature HMAC_SHA256 → tagihan lunas.
 *   5. Fallback: GET /api/publik/duitku/status?orderId= → live-check.
 *
 * API Duitku V2 (dari dokumentasi resmi):
 *   - Create transaksi : POST {base}/webapi/api/merchant/v2/inquiry        (JSON)
 *   - Cek status       : POST {base}/webapi/api/merchant/transactionStatus (JSON)
 *   - Get payment method: POST {base}/webapi/api/merchant/paymentmethod/getpaymentmethod (JSON)
 *   - Callback         : POST ke callbackUrl (x-www-form-urlencoded) dari Duitku
 *
 * Signature (semua HMAC_SHA256 hex lowercase — MD5 SUDAH OBSOLETE):
 *   - Create  : stringToSign = merchantCode + merchantOrderId + paymentAmount
 *   - Callback: stringToSign = merchantCode + amount + merchantOrderId
 *   - Status  : stringToSign = merchantCode + merchantOrderId
 *   - Methods : stringToSign = merchantcode + paymentAmount + datetime (yyyy-MM-dd HH:mm:ss)
 *
 * Semantik kode status:
 *   - Callback  resultCode : 00 = sukses, 01 = gagal
 *   - Cek status statusCode: 00 = sukses, 01 = pending, 02 = dibatalkan
 *   - Redirect  resultCode : 00 = sukses, 01 = pending, 02 = dibatalkan
 *     (JANGAN update status pembayaran dari redirect — bisa dimanipulasi user;
 *      hanya pakai callback / cek status.)
 *
 * Catatan operasional:
 *   - IP outgoing callback Duitku (whitelist firewall, production):
 *     182.23.85.8, .9, .10, .13, .14; 103.177.101.184, .185, .186, .189, .190
 *     Sandbox: 182.23.85.11, .12; 103.177.101.187, .188
 *   - Endpoint cek status punya hit-rate limit: jangan panggil berulang dalam cron;
 *     blokir ±1 jam saat mencapai batas. Pakai sparingly (manual/on-demand).
 *   - Callback mengembalikan HTTP 200; Duitku retry maks 5x lalu email notifikasi.
 */
import crypto from "crypto";

// Data channel (label + daftar metode) dipisah ke modul murni agar aman
// dipakai dari komponen client tanpa ikut menarik `crypto`/prisma ke browser.
export { duitkuChannelLabel, DUITKU_METHODS } from "./duitku-channels";
export type { DuitkuPaymentMethod } from "./duitku-channels";
import type { DuitkuPaymentMethod as _DuitkuPaymentMethod } from "./duitku-channels";
// Alias lokal agar bisa dipakai di tipe return fungsi modul ini.
type DuitkuPaymentMethod = _DuitkuPaymentMethod;

export function merchantCode(): string {
  return process.env.DUITKU_MERCHANT_CODE?.trim() || "";
}

export function apiKey(): string {
  return process.env.DUITKU_API_KEY?.trim() || "";
}

export function isDuitkuEnabled(): boolean {
  return Boolean(merchantCode() && apiKey());
}

export function isDuitkuProduction(): boolean {
  return process.env.DUITKU_IS_PRODUCTION === "true";
}

/** Base URL API Duitku (sandbox / production) — sesuai dokumentasi resmi. */
export function duitkuBaseUrl(): string {
  return isDuitkuProduction()
    ? "https://passport.duitku.com"
    : "https://sandbox.duitku.com";
}

/** Menentukan Base URL aplikasi yang valid untuk webhook & return gateway. */
export function getAppBaseUrl(): string {
  return "https://upsheru.com";
}

/** URL callback (webhook) — WAJIB publik HTTPS saat production. */
export function duitkuCallbackUrl(): string {
  const base = getAppBaseUrl();
  return `${base}/api/publik/duitku/notification`;
}

/** URL return (redirect setelah pembayaran selesai di Duitku). */
export function duitkuReturnUrl(): string {
  const base = getAppBaseUrl();
  return `${base}/bayar-tagihan`;
}

/** HMAC-SHA256 hex lowercase — standar signature Duitku V2 (MD5 obsolete). */
export function hmacSha256(input: string, key: string): string {
  return crypto.createHmac("sha256", key).update(input).digest("hex");
}

/** Signature create: HMAC_SHA256(merchantCode + merchantOrderId + paymentAmount, apiKey) */
export function signatureCreate(merchantCode: string, orderId: string, amount: number, key: string): string {
  return hmacSha256(`${merchantCode}${orderId}${amount}`, key);
}

/** Signature callback: HMAC_SHA256(merchantCode + amount + merchantOrderId, apiKey) */
export function signatureCallback(merchantCode: string, amount: string, orderId: string, key: string): string {
  return hmacSha256(`${merchantCode}${amount}${orderId}`, key);
}

/** Signature cek status: HMAC_SHA256(merchantCode + merchantOrderId, apiKey) */
export function signatureStatus(merchantCode: string, orderId: string, key: string): string {
  return hmacSha256(`${merchantCode}${orderId}`, key);
}

/** Signature get payment method: HMAC_SHA256(merchantcode + paymentAmount + datetime, apiKey) */
export function signatureGetPaymentMethod(merchantCode: string, amount: number, datetime: string, key: string): string {
  return hmacSha256(`${merchantCode}${amount}${datetime}`, key);
}

export type CreatePaymentParams = {
  orderId: string;
  amount: number;
  paymentMethod: string;
  productDetails: string;
  customerVaName: string;
  email?: string;
  phoneNumber?: string;
  /** Masa berlaku transaksi dalam MENIT (default 1440 = 24 jam). */
  expiryPeriod?: number;
};

export type DuitkuCreateResponse = {
  merchantCode?: string;
  reference?: string;
  paymentUrl?: string;
  vaNumber?: string;
  qrString?: string;
  appUrl?: string;
  amount?: string | number;
  statusCode?: string;
  statusMessage?: string;
  error?: string;
};

/**
 * Buat transaksi pembayaran di Duitku (V2 inquiry).
 * Mengembalikan paymentUrl untuk redirect pelanggan.
 * Body JSON — API key TIDAK dikirim (hanya dipakai untuk signature).
 */
export async function createPayment(params: CreatePaymentParams): Promise<DuitkuCreateResponse> {
  const mc = merchantCode();
  const key = apiKey();
  if (!isDuitkuEnabled()) {
    throw new Error("Pembayaran online (Duitku) belum dikonfigurasi");
  }

  const signature = signatureCreate(mc, params.orderId, params.amount, key);

  const body: Record<string, unknown> = {
    merchantCode: mc,
    paymentAmount: params.amount,
    paymentMethod: params.paymentMethod,
    merchantOrderId: params.orderId,
    productDetails: params.productDetails,
    customerVaName: params.customerVaName,
    callbackUrl: duitkuCallbackUrl(),
    returnUrl: duitkuReturnUrl(),
    signature,
    expiryPeriod: params.expiryPeriod ?? 1440, // 24 jam — cukup untuk iuran bulanan
  };
  if (params.email) body.email = params.email;
  if (params.phoneNumber) body.phoneNumber = params.phoneNumber;
  // itemDetails opsional tapi disarankan docs; total price = paymentAmount
  body.itemDetails = [
    { name: params.productDetails.slice(0, 100), price: params.amount, quantity: 1 },
  ];

  const url = `${duitkuBaseUrl()}/webapi/api/merchant/v2/inquiry`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: DuitkuCreateResponse = {};
  try {
    data = JSON.parse(text) as DuitkuCreateResponse;
  } catch {
    throw new Error(`Duitku createPayment gagal (${res.status}): ${text.slice(0, 300)}`);
  }

  if (!res.ok || data.statusCode !== "00") {
    // Duitku memakai field "Message" (kapital) pada error non-200, mis.
    // "Payment channel not available" — capture agar user dapat pesan jelas.
    const pesan =
      (data as { Message?: string }).Message || data.statusMessage || data.error || `HTTP ${res.status}`;
    throw new Error(`Duitku: ${pesan}`);
  }
  if (!data.paymentUrl) {
    throw new Error("Duitku tidak mengembalikan paymentUrl");
  }
  return data;
}

export type DuitkuStatusResponse = {
  merchantCode?: string;
  merchantOrderId?: string;
  reference?: string;
  amount?: string | number;
  fee?: string | number;
  statusCode?: string;
  statusMessage?: string;
};

/**
 * Cek status transaksi langsung ke Duitku (fallback saat webhook tidak terjangkau).
 * PERHATIAN: endpoint ini punya hit-rate limit — jangan panggil berulang (cron).
 */
export async function getDuitkuTransactionStatus(orderId: string): Promise<DuitkuStatusResponse | null> {
  const mc = merchantCode();
  const key = apiKey();
  if (!isDuitkuEnabled()) return null;

  const signature = signatureStatus(mc, orderId, key);
  const body = {
    merchantCode: mc,
    merchantOrderId: orderId,
    signature,
  };

  const url = `${duitkuBaseUrl()}/webapi/api/merchant/transactionStatus`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as DuitkuStatusResponse;
  } catch {
    return null;
  }
}

/**
 * Verifikasi signature callback Duitku.
 * Callback dikirim form-encoded dengan signature HMAC_SHA256(merchantCode + amount + merchantOrderId, apiKey).
 */
export function verifyCallbackSignature(params: {
  merchantCode?: string;
  amount?: string;
  merchantOrderId?: string;
  signature?: string;
}): boolean {
  const key = apiKey();
  if (!key) return false;
  const { merchantCode: mc, amount, merchantOrderId, signature } = params;
  if (!mc || !amount || !merchantOrderId || !signature) return false;
  const expected = signatureCallback(mc, amount, merchantOrderId, key);
  return expected === signature;
}

/** Status Duitku yang berarti pembayaran sukses (berlaku untuk callback & cek status). */
export function isSuccessStatusCode(statusCode?: string | null): boolean {
  return statusCode === "00";
}

/**
 * Status Duitku yang berarti pembayaran gagal final (tidak akan lunas).
 * Semantik BERBEDA antara callback dan cek status:
 *   - callback (resultCode): 01 = gagal
 *   - cek status (statusCode): 02 = dibatalkan/gagal (01 = masih pending)
 */
export function isFinalFailedStatusCode(
  statusCode?: string | null,
  source: "callback" | "status" = "status"
): boolean {
  return source === "callback" ? statusCode === "01" : statusCode === "02";
}

/**
 * Ambil daftar metode pembayaran yang AKTIF untuk merchant (dari Duitku).
 * Opsional per docs — dipakai untuk menampilkan channel yang benar-benar aktif,
 * fallback ke DUITKU_METHODS jika gagal / belum dikonfigurasi.
 */
export async function getPaymentMethods(amount: number): Promise<DuitkuPaymentMethod[] | null> {
  const mc = merchantCode();
  const key = apiKey();
  if (!isDuitkuEnabled()) return null;

  const datetime = formatDuitkuDatetime(new Date());
  const signature = signatureGetPaymentMethod(mc, amount, datetime, key);
  const body = {
    merchantcode: mc,
    amount,
    datetime,
    signature,
  };

  const url = `${duitkuBaseUrl()}/webapi/api/merchant/paymentmethod/getpaymentmethod`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { responseCode?: string; paymentFee?: DuitkuPaymentMethod[] };
    if (data.responseCode !== "00" || !Array.isArray(data.paymentFee)) return null;
    return data.paymentFee;
  } catch {
    return null;
  }
}

/** Format tanggal Duitku: yyyy-MM-dd HH:mm:ss (waktu lokal server). */
export function formatDuitkuDatetime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** Potong JSON mentah (untuk disimpan di rawResponse, max 4KB). */
export function truncateRaw(raw: unknown): string {
  const s = JSON.stringify(raw) ?? "";
  return s.length > 4000 ? s.slice(0, 4000) : s;
}
