import { NextResponse } from "next/server";
import { processIncomingWaMessage } from "@/lib/server/wa-bot-service";
import { kirimWhatsApp } from "@/lib/wa";
import { createHash, timingSafeEqual } from "node:crypto";
import { allowAttempt } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Verifikasi secret webhook secara konstan (SHA-256 timing-safe compare)
 * untuk mencegah serangan timing attack dan buffer-length exception.
 */
function verifySecret(supplied: string, expected: string): boolean {
  if (!supplied || !expected) return false;
  const hashSupplied = createHash("sha256").update(supplied).digest();
  const hashExpected = createHash("sha256").update(expected).digest();
  return timingSafeEqual(hashSupplied, hashExpected);
}

/**
 * OPTIONS /api/publik/wa-webhook
 * Penanganan CORS preflight request.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-webhook-secret",
    },
  });
}

/**
 * GET /api/publik/wa-webhook
 * Endpoint pengujian / verifikasi ketersediaan webhook oleh admin / Fonnte.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "WastePay WhatsApp Bot Webhook (Fonnte Compatible)",
      timestamp: new Date().toISOString(),
      documentation: "Hubungkan URL ini ke Fonnte Dashboard: https://md.fonnte.com/ (Menu Device > Webhook)",
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    }
  );
}

/**
 * POST /api/publik/wa-webhook
 * Webhook penerima pesan masuk dari Fonnte (md.fonnte.com).
 * Mendukung format JSON dan form-data / x-www-form-urlencoded.
 */
export async function POST(request: Request) {
  const secret = process.env.WA_WEBHOOK_SECRET?.trim();

  // Fail-closed di semua environment (minimal 32 karakter untuk jaminan keamanan)
  if (!secret || secret.length < 32) {
    return NextResponse.json({ error: "Webhook belum dikonfigurasi" }, { status: 503 });
  }

  // Prefer header; query token supports providers configured only with a webhook URL.
  const supplied =
    request.headers.get("x-webhook-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    new URL(request.url).searchParams.get("token") ||
    "";

  if (!verifySecret(supplied, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit global IP untuk mencegah network flood DoS
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await allowAttempt(`wa-webhook:${ip}`, { max: 300, windowMs: 60_000 }))) {
    return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 });
  }

  try {
    let rawSender = "";
    let message = "";
    let name = "";
    let url = "";
    let isGroup = false;
    let fromMe = false;
    let device = "";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      rawSender = String(body.sender || body.from || body.phone || "");
      message = String(body.message || body.text || body.msg || "");
      name = String(body.name || body.pushname || "");
      url = String(body.url || body.media_url || body.image || "");
      device = String(body.device || "");
      isGroup = Boolean(body.isGroup || body.group || body.member || rawSender.includes("-") || rawSender.includes("@g.us"));
      fromMe = Boolean(body.fromMe || body.from_me);
    } else {
      // Form-data atau x-www-form-urlencoded
      const formData = await request.formData().catch(() => null);
      if (formData) {
        rawSender = String(formData.get("sender") || formData.get("from") || formData.get("phone") || "");
        message = String(formData.get("message") || formData.get("text") || formData.get("msg") || "");
        name = String(formData.get("name") || formData.get("pushname") || "");
        url = String(formData.get("url") || formData.get("media_url") || formData.get("image") || "");
        device = String(formData.get("device") || "");
        isGroup = Boolean(formData.get("isGroup") || formData.get("group") || formData.get("member") || rawSender.includes("-") || rawSender.includes("@g.us"));
        fromMe = Boolean(formData.get("fromMe") || formData.get("from_me"));
      }
    }

    // Sanitasi nomor pengirim: buang JID multi-device (:1, @s.whatsapp.net, @c.us)
    const cleanSender = rawSender.split("@")[0].split(":")[0].replace(/\D/g, "");
    const cleanDevice = device.split("@")[0].split(":")[0].replace(/\D/g, "");

    if (!cleanSender) {
      return NextResponse.json(
        { error: "Sender number is required" },
        { status: 400 }
      );
    }

    // Cek jika pengirim adalah perangkat bot itu sendiri (hindari infinite loop / echo)
    if (cleanDevice && cleanSender === cleanDevice) {
      fromMe = true;
    }

    // Abaikan pesan grup atau pesan keluar dari perangkat sendiri agar bot tidak spam
    if (isGroup) {
      return NextResponse.json({
        status: true,
        sent: false,
        message: "Pesan grup diabaikan oleh bot",
      });
    }

    if (fromMe) {
      return NextResponse.json({
        status: true,
        sent: false,
        message: "Pesan keluar dari perangkat sendiri diabaikan",
      });
    }

    // Rate-limit per pengirim (30 pesan/menit per nomor WA agar gateway Fonnte tidak dicekik bersama)
    if (!(await allowAttempt(`wa-sender:${cleanSender}`, { max: 30, windowMs: 60_000 }))) {
      return NextResponse.json({ error: "Terlalu banyak permintaan dari nomor ini" }, { status: 429 });
    }

    // Eksekusi kecerdasan bot berbasis database WastePay
    const result = await processIncomingWaMessage({
      sender: cleanSender,
      message,
      name,
      url,
    });

    // Kirim pesan balasan secara langsung via API Fonnte jika reply tidak kosong
    let sent = false;
    let sendError: string | undefined;

    if (result.reply) {
      try {
        const sendRes = await kirimWhatsApp(cleanSender, result.reply);
        sent = sendRes.ok;
        sendError = sendRes.error;
        if (!sendRes.ok) {
          console.error("Gagal mengirim balasan WA via Fonnte:", sendRes.error);
        }
      } catch (err: any) {
        console.error("Exception saat kirim balasan WA:", err);
        sendError = err instanceof Error ? err.message : String(err);
      }
    }

    // Response HTTP 200 bersih:
    // Tidak mengembalikan key 'reply', 'message', atau 'response' di JSON body
    // untuk mencegah Fonnte mengirim balasan kedua (Double-Reply elimination)
    // dan melindungi kerahasiaan data (PII) dari HTTP response.
    return NextResponse.json({
      status: true,
      sent,
      error: sendError,
    });
  } catch (err: any) {
    console.error("Error in wa-webhook handler:", err);
    return NextResponse.json(
      {
        status: false,
        error: "Internal webhook processing error",
      },
      { status: 500 }
    );
  }
}
