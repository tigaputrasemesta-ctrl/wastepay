import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildCorsHeaders } from "@/lib/server/wastepay-backend-core-services";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request),
  });
}

export async function POST(request: Request) {
  const corsHeaders = buildCorsHeaders(request);

  try {
    const body = await request.json();
    const {
      namaLengkap,
      namaInstansi,
      jenisUsaha,
      noWhatsapp,
      email,
      kota,
      estimasiWarga,
      kebutuhanDb,
      catatanAdmin,
    } = body;

    if (!namaLengkap || !namaInstansi || !noWhatsapp || !email) {
      return NextResponse.json(
        { error: "Nama lengkap, nama instansi, nomor WhatsApp, dan email wajib diisi." },
        { status: 400, headers: corsHeaders }
      );
    }

    // Normalisasi nomor whatsapp
    const cleanPhone = String(noWhatsapp).replace(/\D/g, "").replace(/^0/, "62");

    // Simpan pendaftaran mitra baru ke database core
    const pendaftaran = await prisma.mitraRegistration.create({
      data: {
        namaLengkap: String(namaLengkap).trim(),
        namaInstansi: String(namaInstansi).trim(),
        jenisUsaha: String(jenisUsaha || "tps3r").trim(),
        noWhatsapp: cleanPhone,
        email: String(email).trim().toLowerCase(),
        kota: String(kota || "Kota Depok").trim(),
        estimasiWarga: Number(estimasiWarga) || 0,
        kebutuhanDb: String(kebutuhanDb || "dedicated").trim(),
        catatanAdmin: catatanAdmin ? String(catatanAdmin).trim() : null,
        status: "menunggu_review",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Pendaftaran kemitraan pengelola sampah berhasil dikirim! Tim O2W Hero akan segera menghubungi Anda melalui WhatsApp.",
        data: {
          id: pendaftaran.id,
          instansi: pendaftaran.namaInstansi,
          status: pendaftaran.status,
        },
      },
      { status: 201, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[Core API] Error registrasi mitra:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan sistem saat memproses pendaftaran mitra." },
      { status: 500, headers: corsHeaders }
    );
  }
}
