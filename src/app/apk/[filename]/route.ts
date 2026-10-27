import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GITHUB_RELEASE_BASE =
  "https://github.com/tigaputrasemesta-ctrl/wastepay/releases/download/apk-latest";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  let targetUrl = `${GITHUB_RELEASE_BASE}/${filename}`;

  if (filename === "UPS-HERU-Admin.apk") {
    targetUrl = `${GITHUB_RELEASE_BASE}/UPS-HERU-Admin.apk`;
  } else if (
    filename === "UPS-HERU-Petugas-Native.apk" ||
    filename === "O2W-Lapangan.apk"
  ) {
    targetUrl = `${GITHUB_RELEASE_BASE}/UPS-HERU-Petugas-Native.apk`;
  }

  return NextResponse.redirect(targetUrl, {
    status: 307,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
