import { NextResponse } from "next/server";
import { processIncomingWaMessage } from "@/lib/server/wa-bot-service";
import { kirimWhatsApp } from "@/lib/wa";

export const dynamic = "force-dynamic";

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
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
  try {
    let sender = "";
    let message = "";
    let name = "";
    let url = "";
    let isGroup = false;
    let fromMe = false;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      sender = String(body.sender || body.from || body.phone || "");
      message = String(body.message || body.text || body.msg || "");
      name = String(body.name || body.pushname || "");
      url = String(body.url || body.media_url || body.image || "");
      isGroup = Boolean(body.isGroup || body.group || sender.includes("-") || sender.includes("@g.us"));
      fromMe = Boolean(body.fromMe || body.from_me || (body.device && sender === String(body.device)));
    } else {
      // Form-data atau x-www-form-urlencoded
      const formData = await request.formData().catch(() => null);
      if (formData) {
        sender = String(formData.get("sender") || formData.get("from") || formData.get("phone") || "");
        message = String(formData.get("message") || formData.get("text") || formData.get("msg") || "");
        name = String(formData.get("name") || formData.get("pushname") || "");
        url = String(formData.get("url") || formData.get("media_url") || formData.get("image") || "");
        const rawDevice = formData.get("device") ? String(formData.get("device")) : "";
        isGroup = Boolean(formData.get("isGroup") || formData.get("group") || sender.includes("-") || sender.includes("@g.us"));
        fromMe = Boolean(formData.get("fromMe") || formData.get("from_me") || (rawDevice && sender === rawDevice));
      }
    }

    if (!sender) {
      return NextResponse.json(
        { error: "Sender number is required" },
        { status: 400 }
      );
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

    // Eksekusi kecerdasan bot berbasis database WastePay
    const result = await processIncomingWaMessage({
      sender,
      message,
      name,
      url,
    });

    // Kirim pesan balasan secara langsung via API Fonnte jika reply tidak kosong
    let sent = false;
    let sendError: string | undefined;

    if (result.reply) {
      try {
        const sendRes = await kirimWhatsApp(sender, result.reply);
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

    return NextResponse.json({
      status: true,
      sent,
      error: sendError,
      reply: result.reply || null,
      intent: result.intent,
      pelangganId: result.pelangganId,
    });
  } catch (err: any) {
    console.error("Error in wa-webhook handler:", err);
    return NextResponse.json(
      {
        status: false,
        error: "Internal webhook processing error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
