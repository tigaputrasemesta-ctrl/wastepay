import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hasRole } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

function sanitizePhone(raw: string): string {
  let cleaned = raw.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (!cleaned.startsWith("62") && cleaned.length >= 9) {
    cleaned = "62" + cleaned;
  }
  return cleaned;
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user || !hasRole(user, "admin")) {
    return NextResponse.json({ error: "Unauthorized — Khusus admin" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const rows: any[] = Array.isArray(body.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "Tidak ada baris data untuk diimpor" }, { status: 400 });
    }

    if (rows.length > 1000) {
      return NextResponse.json({ error: "Maksimal 1000 baris per sekali impor" }, { status: 400 });
    }

    // Cache kelurahan for lookup
    const allKelurahan = await prisma.kelurahan.findMany({ select: { id: true, nama: true } });
    const kelurahanMap = new Map<string, number>();
    allKelurahan.forEach((k) => {
      kelurahanMap.set(k.nama.toLowerCase().trim(), k.id);
    });

    // Existing phone numbers in DB for fast duplicate detection
    const existingPhones = new Set(
      (await prisma.pelanggan.findMany({
        where: { deletedAt: null },
        select: { noTelepon: true },
      })).map((p) => p.noTelepon)
    );

    const validDataToInsert: any[] = [];
    const errors: Array<{ row: number; nama?: string; message: string }> = [];
    const seenPhonesInBatch = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;
      const nama = r.nama ? String(r.nama).trim() : "";
      const rawPhone = r.noTelepon || r.telepon || r.whatsapp || r.noHp || "";
      const phone = sanitizePhone(String(rawPhone).trim());
      const alamat = r.alamat ? String(r.alamat).trim() : "";

      if (!nama) {
        errors.push({ row: rowNum, message: "Nama wajib diisi" });
        continue;
      }
      if (!phone || phone.length < 10) {
        errors.push({ row: rowNum, nama, message: `Nomor telepon tidak valid (${rawPhone})` });
        continue;
      }
      if (!alamat) {
        errors.push({ row: rowNum, nama, message: "Alamat wajib diisi" });
        continue;
      }
      if (existingPhones.has(phone)) {
        errors.push({ row: rowNum, nama, message: `Nomor telepon ${phone} sudah terdaftar di sistem` });
        continue;
      }
      if (seenPhonesInBatch.has(phone)) {
        errors.push({ row: rowNum, nama, message: `Nomor telepon ${phone} duplikat di file import ini` });
        continue;
      }

      seenPhonesInBatch.add(phone);

      // Resolve kelurahan
      let kelurahanId: number | null = null;
      if (r.kelurahanId && !isNaN(parseInt(r.kelurahanId))) {
        kelurahanId = parseInt(r.kelurahanId);
      } else if (r.kelurahan) {
        const kelName = String(r.kelurahan).toLowerCase().replace(/^(kelurahan|kel\.)\s*/, "").trim();
        kelurahanId = kelurahanMap.get(kelName) || null;
      }

      const kategori = r.kategori && String(r.kategori).trim().startsWith("level_")
        ? String(r.kategori).trim()
        : "level_1";

      const status = ["aktif", "calon", "nonaktif", "libur"].includes(String(r.status || "").toLowerCase().trim())
        ? String(r.status).toLowerCase().trim()
        : "aktif";

      const lat = r.latitude ? parseFloat(String(r.latitude)) : null;
      const lng = r.longitude ? parseFloat(String(r.longitude)) : null;
      const customTarif = r.customTarif ? parseFloat(String(r.customTarif)) : null;

      validDataToInsert.push({
        nama,
        noTelepon: phone,
        kodePelanggan: r.kodePelanggan ? String(r.kodePelanggan).trim() : phone,
        alamat,
        rtRw: r.rtRw ? String(r.rtRw).trim() : null,
        patokanLokasi: r.patokanLokasi ? String(r.patokanLokasi).trim() : null,
        kategori,
        status,
        customTarif: customTarif && !isNaN(customTarif) ? customTarif : null,
        kelurahanId,
        latitude: lat && !isNaN(lat) ? lat : null,
        longitude: lng && !isNaN(lng) ? lng : null,
        koordinatSumber: lat && lng ? "manual" : null,
      });
    }

    if (validDataToInsert.length === 0) {
      return NextResponse.json({
        success: false,
        total: rows.length,
        imported: 0,
        skipped: errors.length,
        errors,
      }, { status: 400 });
    }

    // Insert batch
    let importedCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const item of validDataToInsert) {
        await tx.pelanggan.create({ data: item });
        importedCount++;
      }
    });

    await logAudit("create", "PelangganImport", "import", null, {
      totalRows: rows.length,
      importedCount,
      failedCount: errors.length,
      adminId: user.id,
    });

    return NextResponse.json({
      success: true,
      total: rows.length,
      imported: importedCount,
      skipped: errors.length,
      errors,
    });
  } catch (err: any) {
    console.error("Gagal import pelanggan:", err);
    return NextResponse.json({ error: "Gagal memproses import data warga", detail: err?.message }, { status: 500 });
  }
}
