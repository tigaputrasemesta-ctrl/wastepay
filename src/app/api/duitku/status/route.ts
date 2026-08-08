import { NextResponse } from "next/server";
import {
  isDuitkuEnabled,
  isDuitkuProduction,
  duitkuBaseUrl,
  duitkuCallbackUrl,
} from "@/lib/duitku";

/**
 * GET /api/duitku/status
 * Status konfigurasi Duitku untuk halaman Pengaturan (admin).
 * Tidak membocorkan key, hanya menampilkan apakah sudah diisi.
 */
export async function GET(request: Request) {
  const enabled = isDuitkuEnabled();
  const merchantCodeSet = Boolean(process.env.DUITKU_MERCHANT_CODE?.trim());
  const apiKeySet = Boolean(process.env.DUITKU_API_KEY?.trim());

  const origin = request.headers.get("origin") || request.headers.get("referer") || "";
  let webhookUrl = `${origin}/api/publik/duitku/notification`;
  if (!origin) {
    const host = request.headers.get("host") || "localhost:3000";
    const proto = host.includes("localhost") ? "http" : "https";
    webhookUrl = `${proto}://${host}/api/publik/duitku/notification`;
  }

  return NextResponse.json({
    enabled,
    merchantCodeSet,
    apiKeySet,
    production: isDuitkuProduction(),
    baseUrl: duitkuBaseUrl(),
    callbackUrl: duitkuCallbackUrl(),
    webhookUrl,
  });
}
