import { NextResponse } from "next/server";
import { MOBILE_VERSION, getApkUrl } from "@/lib/mobile-version";

export const dynamic = "force-dynamic";

/**
 * Versi terbaru APK O2W Lapangan.
 * Dipanggil oleh aplikasi mobile saat startup untuk mengecek update.
 */
export async function GET() {
  return NextResponse.json({
    ...MOBILE_VERSION,
    apkUrl: getApkUrl(),
  });
}
