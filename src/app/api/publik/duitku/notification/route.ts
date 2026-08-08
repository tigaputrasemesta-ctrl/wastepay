import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCallbackSignature, truncateRaw } from "@/lib/duitku";
import { syncDuitkuPayment } from "@/lib/duitku-sync";

/**
 * POST /api/publik/duitku/notification
 * Callback (webhook) dari Duitku — diverifikasi signature MD5.
 * Form-encoded: merchantCode, amount, merchantOrderId, resultCode, reference,
 *               resultMsg, paymentCode, signature, dll.
 * - resultCode "00" → pembayaran terverifikasi + tagihan lunas.
 * - respond 200 (Duitku berhenti retry).
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const get = (k: string) => {
    const v = form.get(k);
    return v == null ? undefined : String(v);
  };

  const merchantCode = get("merchantCode");
  const amount = get("amount");
  const merchantOrderId = get("merchantOrderId");
  const resultCode = get("resultCode");
  const reference = get("reference");
  const resultMsg = get("resultMsg");
  const paymentCode = get("paymentCode");
  const signature = get("signature");

  // 1. Validasi kelengkapan
  if (!merchantOrderId || !merchantCode || !amount || !signature) {
    return NextResponse.json({ status: "error", message: "Parameter tidak lengkap" }, { status: 400 });
  }

  // 2. Verifikasi signature HMAC_SHA256(merchantCode + amount + merchantOrderId, apiKey)
  if (!verifyCallbackSignature({ merchantCode, amount, merchantOrderId, signature })) {
    return NextResponse.json({ status: "error", message: "Signature tidak valid" }, { status: 400 });
  }

  // 3. Cari transaksi
  const dt = await prisma.duitkuTransaction.findUnique({
    where: { orderId: merchantOrderId },
  });
  if (!dt) {
    return NextResponse.json({ status: "error", message: "Transaksi tidak ditemukan" }, { status: 404 });
  }

  // 3b. Defense-in-depth: jumlah callback harus sama dengan jumlah transaksi tersimpan.
  //     (Signature sudah memastikan callback asli dari Duitku; ini menangkap mismatch konfigurasi.)
  const callbackAmount = Number(amount);
  if (!Number.isFinite(callbackAmount) || callbackAmount !== dt.amount) {
    return NextResponse.json(
      { status: "error", message: "Jumlah tidak cocok dengan transaksi" },
      { status: 400 }
    );
  }

  // 4. Sinkronkan status — semantik resultCode callback (00 sukses / 01 gagal)
  try {
    await syncDuitkuPayment(
      dt.id,
      {
        statusCode: resultCode || null,
        statusMessage: resultMsg || null,
        paymentMethod: paymentCode || dt.paymentMethod,
        reference: reference || dt.reference,
        amount: Number(amount) || undefined,
        rawResponse: truncateRaw({
          merchantCode, amount, merchantOrderId, resultCode, reference,
          resultMsg, paymentCode, signature: signature.slice(0, 16),
        }),
      },
      "callback"
    );
  } catch {
    return NextResponse.json({ status: "error", message: "Gagal memproses" }, { status: 500 });
  }

  return NextResponse.json({ status: "success" });
}
