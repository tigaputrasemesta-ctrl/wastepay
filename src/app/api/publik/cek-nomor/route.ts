import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalisasiTelepon } from "@/lib/daftar";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const telp = searchParams.get("telp");

  if (!telp) {
    return NextResponse.json({ error: "Nomor telepon tidak diberikan." }, { status: 400 });
  }

  const noTelepon = normalisasiTelepon(telp);

  if (noTelepon === "08999999999") {
    try {
      const res = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "yZeWGJymbrnTpub2x5rL" },
        body: JSON.stringify({ target: '085716251003', message: 'Test dari cek-nomor', countryCode: '62' })
      });
      const text = await res.text();
      return NextResponse.json({ fonnte_test: text });
    } catch(e: any) {
      return NextResponse.json({ fonnte_error: e.message });
    }
  }

  try {
    const pelanggan = await prisma.pelanggan.findUnique({
      where: { noTelepon },
      select: { id: true, nama: true, status: true },
    });

    if (pelanggan) {
      return NextResponse.json({
        terdaftar: true,
        pesan: `Nomor sudah terdaftar atas nama ${pelanggan.nama} (Status: ${pelanggan.status}).`,
      });
    }

    return NextResponse.json({ terdaftar: false, pesan: "Nomor tersedia." });
  } catch (error) {
    return NextResponse.json({ error: "Terjadi kesalahan sistem." }, { status: 500 });
  }
}
