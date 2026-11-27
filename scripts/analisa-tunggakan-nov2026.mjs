import pg from "pg";

const { Pool } = pg;

const rawConn = (process.env.DATABASE_URL || "").trim().replace(/^["']|["']$/g, "");
if (!rawConn) {
  console.error("❌ ERROR: DATABASE_URL tidak diatur!");
  process.exit(1);
}

const cleanConn = rawConn
  .replace(/[?&]sslmode=[^&]+/g, "")
  .replace(/[?&]pgbouncer=[^&]+/g, "")
  .replace(/[?&]schema=[^&]+/g, "")
  .replace(/\?$/, "");

const pool = new Pool({
  connectionString: cleanConn,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

export function validateIndonesianPhone(raw) {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    return { valid: false, reason: "Nomor kosong / NULL", clean: "", formatted: "" };
  }
  const digits = raw.replace(/\D/g, "");
  if (!digits) {
    return { valid: false, reason: "Tidak ada angka pada nomor telepon", clean: "", formatted: "" };
  }

  let formatted = digits;
  if (formatted.startsWith("0")) {
    formatted = "62" + formatted.slice(1);
  } else if (formatted.startsWith("8")) {
    formatted = "62" + formatted;
  }

  // Cek awalan valid WhatsApp Indonesia (harus ponsel: 628...)
  if (!formatted.startsWith("628")) {
    if (formatted.startsWith("6221") || formatted.startsWith("62251")) {
      return { valid: false, reason: "Nomor telepon rumah / kabel (bukan HP WA)", clean: digits, formatted };
    }
    return { valid: false, reason: "Bukan format nomor HP Indonesia (tidak diawali 08/628)", clean: digits, formatted };
  }

  // Cek panjang digit (normal nomor HP RI: 10 - 13 digit setelah 62, total 11 - 14 digit)
  if (formatted.length < 11) {
    return { valid: false, reason: `Nomor terlalu pendek (${formatted.length} digit, minimal 11 digit)`, clean: digits, formatted };
  }
  if (formatted.length > 15) {
    return { valid: false, reason: `Nomor terlalu panjang (${formatted.length} digit, maksimal 15 digit)`, clean: digits, formatted };
  }

  // Cek pola dummy (seperti 628123456789 atau angka berulang)
  if (/^628(\d)\1{7,}$/.test(formatted)) {
    return { valid: false, reason: "Pola angka dummy / berulang", clean: digits, formatted };
  }

  return { valid: true, reason: "OK", clean: digits, formatted };
}

async function run() {
  const client = await pool.connect();
  console.log("Connected to PostgreSQL successfully.\n");

  try {
    const query = `
      SELECT 
        t.id as "tagihanId",
        t."noInvoice",
        t.jumlah,
        t.status as "tagihanStatus",
        p.id as "pelangganId",
        p."kodePelanggan",
        p.nama,
        p."noTelepon",
        p.alamat,
        p."rtRw",
        COALESCE(w.nama, '-') as wilayah,
        COALESCE(z.nama, 'Tanpa Zona') as zona
      FROM "Tagihan" t
      JOIN "Pelanggan" p ON t."pelangganId" = p.id
      LEFT JOIN "Wilayah" w ON p."wilayahId" = w.id
      LEFT JOIN "Zona" z ON w."zonaId" = z.id
      WHERE t.tahun = 2026 AND t.bulan = 11
        AND t.status = 'tunggakan'
        AND (t."tenantId" = 'tenant-pilot-upsheru' OR t."tenantId" IS NULL)
        AND t."deletedAt" IS NULL
        AND p."deletedAt" IS NULL
      ORDER BY z.nama ASC, p.nama ASC;
    `;

    const res = await client.query(query);
    const rows = res.rows;
    console.log(`Total data tagihan tunggakan November 2026 terambil: ${rows.length}`);

    const validList = [];
    const invalidList = [];
    const phoneMap = new Map();
    const duplicateList = [];

    for (const r of rows) {
      const v = validateIndonesianPhone(r.noTelepon);
      const item = {
        ...r,
        phoneValidation: v,
      };

      if (!v.valid) {
        invalidList.push(item);
      } else {
        validList.push(item);
        if (phoneMap.has(v.formatted)) {
          duplicateList.push({
            phone: v.formatted,
            current: { id: r.pelangganId, nama: r.nama, inv: r.noInvoice },
            existing: phoneMap.get(v.formatted),
          });
        } else {
          phoneMap.set(v.formatted, { id: r.pelangganId, nama: r.nama, inv: r.noInvoice });
        }
      }
    }

    const report = {
      totalTarget: rows.length,
      totalValidPhone: validList.length,
      totalInvalidPhone: invalidList.length,
      totalDuplicates: duplicateList.length,
      invalidRecords: invalidList,
      duplicateRecords: duplicateList,
      allRecords: rows.map(r => ({
        tagihanId: r.tagihanId,
        pelangganId: r.pelangganId,
        noInvoice: r.noInvoice,
        nama: r.nama,
        noTeleponAsli: r.noTelepon,
        noTeleponWA: validateIndonesianPhone(r.noTelepon).formatted,
        validWA: validateIndonesianPhone(r.noTelepon).valid,
        alasanValidasi: validateIndonesianPhone(r.noTelepon).reason,
        jumlah: r.jumlah,
        zona: r.zona,
        wilayah: r.wilayah,
        alamat: r.alamat,
      })),
    };

    console.log("=== JSON_ANALYSIS_START ===");
    console.log(JSON.stringify(report, null, 2));
    console.log("=== JSON_ANALYSIS_END ===");

    console.log("\n=======================================================");
    console.log("📊 RINGKASAN AUDIT NOMOR TELEPON (247 WARGA TUNGGAKAN NOV 2026):");
    console.log("=======================================================");
    console.log(`Total Target Warga              : ${rows.length}`);
    console.log(`Nomor WhatsApp VALID (Bisa Blast): ${validList.length}`);
    console.log(`Nomor TIDAK VALID (Gagal Blast)  : ${invalidList.length}`);
    console.log(`Nomor Duplikat / Nomor Bersama   : ${duplicateList.length}`);

    if (invalidList.length > 0) {
      console.log("\n⚠️ DAFTAR NOMOR TIDAK VALID (TIDAK AKAN BISA TERKIRIM):");
      console.table(invalidList.map(i => ({
        ID: i.pelangganId,
        Nama: i.nama,
        NoTelepon: i.noTelepon,
        Alasan: i.phoneValidation.reason,
        Zona: i.zona,
      })));
    }

    if (duplicateList.length > 0) {
      console.log("\n👥 DAFTAR NOMOR DUPLIKAT (2+ Pelanggan memakai no HP sama):");
      console.table(duplicateList.map(d => ({
        Nomor: d.phone,
        Pelanggan1: `${d.existing.nama} (${d.existing.id})`,
        Pelanggan2: `${d.current.nama} (${d.current.id})`,
      })));
    }

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("❌ Execution Error:", err);
  process.exit(1);
});
