import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalisasiTelepon } from "@/lib/daftar";
import { allowAttempt, retryAfterSeconds } from "@/lib/rate-limit";
import { getTenantFromRequest, buildTenantFilter } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const tenantCtx = await getTenantFromRequest(request);
  if (!tenantCtx.isValid || tenantCtx.isCore) {
    return NextResponse.json(
      { error: "Layanan pengecekan nomor hanya tersedia pada portal mitra operasional." },
      { status: 403 }
    );
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (!(await allowAttempt(`cek-nomor:${ip}`, { max: 20, windowMs: 60 * 1000 }))) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Silakan coba beberapa saat lagi." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(`cek-nomor:${ip}`)) },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const telp = searchParams.get("telp");

  if (!telp) {
    return NextResponse.json({ error: "Nomor telepon tidak diberikan." }, { status: 400 });
  }

  const rawClean = normalisasiTelepon(telp).replace(/^\+/, "");
  const localNum = rawClean.startsWith("62") ? `0${rawClean.slice(2)}` : rawClean;
  const intlNum = localNum.startsWith("0") ? `62${localNum.slice(1)}` : localNum;
  const phoneCandidates = Array.from(new Set([rawClean, localNum, intlNum].filter(Boolean)));

  try {
    const tenantScope = buildTenantFilter(tenantCtx.tenant.id, tenantCtx.isPilot);
    const pelanggan = await prisma.pelanggan.findFirst({
      where: {
        ...tenantScope,
        deletedAt: null,
        OR: phoneCandidates.map((n) => ({ noTelepon: n })),
      },
      select: { id: true, status: true },
    });

    if (pelanggan) {
      return NextResponse.json({
        terdaftar: true,
        pesan:
          pelanggan.status === "calon"
            ? "Nomor WhatsApp ini sudah terdaftar dan sedang menunggu verifikasi admin (Calon Warga)."
            : "Nomor WhatsApp ini sudah terdaftar sebagai pelanggan.",
      });
    }

    return NextResponse.json({ terdaftar: false, pesan: "Nomor tersedia." });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan sistem." }, { status: 500 });
  }
}
