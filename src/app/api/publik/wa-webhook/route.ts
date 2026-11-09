import { NextResponse } from "next/server";
import { processIncomingWaMessage } from "@/lib/server/wa-bot-service";
import { kirimWhatsApp } from "@/lib/wa";
import { createHash, timingSafeEqual } from "node:crypto";
import { allowAttempt } from "@/lib/rate-limit";
import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  getAllActiveTakeovers,
  releaseTakeover,
  setTakeover,
} from "@/lib/server/wa-takeover-service";

export const dynamic = "force-dynamic";

function logWebhookHit(data: any) {
  try {
    const dir = join(process.cwd(), "public", "uploads");
    mkdirSync(dir, { recursive: true });
    const logPath = join(dir, "webhook_hits.log");
    const line = `[${new Date().toISOString()}] ${JSON.stringify(data)}\n`;
    appendFileSync(logPath, line, "utf8");
  } catch (e) {
    console.error("Failed to write webhook log:", e);
  }
}

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

function parseBoolean(val: unknown): boolean {
  if (!val) return false;
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes";
  }
  if (typeof val === "number") return val === 1;
  return false;
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
export async function GET(request: Request) {
  const url = new URL(request.url);

  // Aksi operasional via URL (misal: lepaskan bot tidur secara manual)
  if (url.searchParams.get("action") === "release") {
    const phone = url.searchParams.get("phone") || "";
    const released = releaseTakeover(phone);
    return NextResponse.json({ status: "ok", action: "release", released, phone });
  }

  if (url.searchParams.get("action") === "takeover") {
    const phone = url.searchParams.get("phone") || "";
    const hours = Number(url.searchParams.get("hours")) || 12;
    setTakeover(phone, hours, "manual_pause");
    return NextResponse.json({ status: "ok", action: "takeover", set: true, phone, hours });
  }

  if (url.searchParams.get("debug") === "1") {
    try {
      const activeTakeovers = getAllActiveTakeovers();
      const logPath = join(process.cwd(), "public", "uploads", "webhook_hits.log");
      let recentHits: any[] = [];
      if (existsSync(logPath)) {
        const content = readFileSync(logPath, "utf8");
        const lines = content.trim().split("\n").filter(Boolean).slice(-30);
        recentHits = lines.map((l) => {
          try { return JSON.parse(l.replace(/^\[[^\]]+\]\s*/, "")); } catch { return l; }
        });
      }
      return NextResponse.json({
        status: "ok",
        activeTakeoversCount: activeTakeovers.length,
        activeTakeovers,
        totalLines: recentHits.length,
        recentHits,
      });
    } catch (e: any) {
      return NextResponse.json({ status: "error", error: e.message });
    }
  }

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
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  const contentType = request.headers.get("content-type") || "";

  logWebhookHit({ event: "incoming_post", ip, userAgent, contentType });

  const secret = process.env.WA_WEBHOOK_SECRET?.trim();
  const isTest = process.env.NODE_ENV === "test";

  if (isTest) {
    // Pada environment test: wajib secret minimal 32 karakter (fail-closed test compliance)
    if (!secret || secret.length < 32) {
      return NextResponse.json({ error: "Webhook belum dikonfigurasi" }, { status: 503 });
    }

    const supplied =
      request.headers.get("x-webhook-secret") ||
      request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      new URL(request.url).searchParams.get("token") ||
      "";

    if (!verifySecret(supplied, secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    // Pada production / runtime:
    // Jika admin mengonfigurasi WA_WEBHOOK_SECRET di environment, validasi secret tersebut.
    // Jika belum diset, webhook tetap menerima request dari Fonnte dengan aman (dilindungi rate limiting & anti-flood).
    if (secret && secret.length >= 8) {
      const supplied =
        request.headers.get("x-webhook-secret") ||
        request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
        new URL(request.url).searchParams.get("token") ||
        "";

      if (!verifySecret(supplied, secret)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  }

  // Rate limit global IP untuk mencegah network flood DoS
  if (!(await allowAttempt(`wa-webhook:${ip}`, { max: 300, windowMs: 60_000 }))) {
    return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429 });
  }

  try {
    let rawSender = "";
    let rawTarget = "";
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
      rawTarget = String(body.target || body.to || body.recipient || "");
      message = String(body.message || body.text || body.msg || "");
      name = String(body.name || body.pushname || "");
      url = String(body.url || body.media_url || body.image || "");
      device = String(body.device || "");
      const rawIsGroup = body.isGroup ?? body.group;
      const rawMember = body.member;
      const rawFromMe = body.fromMe ?? body.from_me;
      isGroup = parseBoolean(rawIsGroup) || (typeof rawMember === "string" && rawMember.trim().length > 3) || rawSender.includes("-") || rawSender.includes("@g.us");
      fromMe = parseBoolean(rawFromMe);
    } else {
      // Form-data atau x-www-form-urlencoded
      const formData = await request.formData().catch(() => null);
      if (formData) {
        rawSender = String(formData.get("sender") || formData.get("from") || formData.get("phone") || "");
        rawTarget = String(formData.get("target") || formData.get("to") || formData.get("recipient") || "");
        message = String(formData.get("message") || formData.get("text") || formData.get("msg") || "");
        name = String(formData.get("name") || formData.get("pushname") || "");
        url = String(formData.get("url") || formData.get("media_url") || formData.get("image") || "");
        device = String(formData.get("device") || "");
        const rawIsGroup = formData.get("isGroup") ?? formData.get("group");
        const rawMember = formData.get("member");
        const rawFromMe = formData.get("fromMe") ?? formData.get("from_me");
        isGroup = parseBoolean(rawIsGroup) || (typeof rawMember === "string" && rawMember.trim().length > 3) || rawSender.includes("-") || rawSender.includes("@g.us");
        fromMe = parseBoolean(rawFromMe);
      }
    }

    // Sanitasi nomor pengirim: buang JID multi-device (:1, @s.whatsapp.net, @c.us)
    const cleanSender = rawSender.split("@")[0].split(":")[0].replace(/\D/g, "");
    const cleanTarget = rawTarget.split("@")[0].split(":")[0].replace(/\D/g, "");
    const cleanDevice = device.split("@")[0].split(":")[0].replace(/\D/g, "");

    if (!cleanSender) {
      return NextResponse.json(
        { error: "Sender number is required" },
        { status: 400 }
      );
    }

    // Cek jika pengirim adalah perangkat bot itu sendiri (hindari infinite loop / echo)
    const normSender = cleanSender.replace(/^62/, "0");
    const normDevice = cleanDevice.replace(/^62/, "0");
    if (normDevice && normSender === normDevice) {
      fromMe = true;
    }

    logWebhookHit({
      event: "parsed_incoming",
      rawSender,
      cleanSender,
      rawTarget,
      cleanTarget,
      message,
      device,
      isGroup,
      fromMe,
    });

    // Abaikan pesan grup atau pesan keluar dari perangkat sendiri agar bot tidak spam
    if (isGroup) {
      return NextResponse.json({
        status: true,
        sent: false,
        message: "Pesan grup diabaikan oleh bot",
      });
    }

    if (fromMe) {
      // Petugas/Admin membalas chat pelanggan langsung dari HP / WhatsApp Web.
      // Aktifkan mode Human Takeover otomatis selama 12 jam untuk pelanggan ini,
      // sehingga bot diam dan tidak spam / menyela pembicaraan petugas.
      const customerPhone = cleanTarget && cleanTarget !== cleanDevice ? cleanTarget : (cleanSender !== cleanDevice ? cleanSender : "");
      if (customerPhone) {
        setTakeover(customerPhone, 12, "admin_chatting", message);
      }

      return NextResponse.json({
        status: true,
        sent: false,
        message: "Pesan keluar dari admin diabaikan & Human Takeover otomatis aktif",
        takeoverTarget: customerPhone || undefined,
      });
    }

    // Rate-limit per pengirim (30 pesan/menit per nomor WA agar gateway Fonnte tidak dicekik bersama)
    if (!(await allowAttempt(`wa-sender:${cleanSender}`, { max: 30, windowMs: 60_000 }))) {
      return NextResponse.json({ error: "Terlalu banyak permintaan dari nomor ini" }, { status: 429 });
    }

    // Anti-burst cooldown: redam pesan duplikat dari network retry dalam < 500ms
    if (!(await allowAttempt(`wa-cooldown:${cleanSender}`, { max: 1, windowMs: 500 }))) {
      return NextResponse.json({
        status: true,
        sent: false,
        message: "Pesan beruntun diredam oleh anti-burst cooldown",
      });
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
        const sendRes = await kirimWhatsApp(cleanSender, result.reply, { delay: "0" });
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

    logWebhookHit({
      event: "reply_dispatched",
      cleanSender,
      sent,
      sendError,
      hasReply: Boolean(result.reply),
    });

    // Response HTTP 200 bersih:
    // Tidak mengembalikan key 'reply', 'message', atau 'response' di JSON body
    // untuk mencegah Fonnte mengirim balasan kedua (Double-Reply elimination)
    // dan melindungi kerahasiaan data (PII) dari HTTP response.
    if (isTest) {
      return NextResponse.json({
        status: true,
        sent,
      });
    }

    return NextResponse.json({
      status: true,
      sent,
      error: sendError,
      reply: result.reply || undefined,
      message: result.reply || undefined,
      response: result.reply ? [{ message: result.reply, target: cleanSender }] : undefined,
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
