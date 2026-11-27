import pg from "pg";

const { Pool } = pg;

const rawConn = (process.env.DATABASE_URL || "").trim().replace(/^["']|["']$/g, "");
if (!rawConn) {
  console.error("❌ ERROR: DATABASE_URL tidak diatur!");
  process.exit(1);
}

// Bersihkan parameter non-standar yang bisa mengganggu pg.Pool
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

const formatRupiah = (num) => "Rp " + Number(num || 0).toLocaleString("id-ID");

async function run() {
  const client = await pool.connect();
  console.log("Connected to PostgreSQL successfully.\n");

  try {
    // 0. Cek Tenant Pilot UPS HERU
    const tenantRes = await client.query(`
      SELECT id, "namaMitra", slug FROM "Tenant" WHERE id = 'tenant-pilot-upsheru';
    `);
    console.log("Tenant Pilot:", tenantRes.rows);

    // 1. Ringkasan seluruh data tagihan per tahun & bulan di UPS HERU
    const allPeriodsRes = await client.query(`
      SELECT 
        tahun, 
        bulan, 
        status, 
        COUNT(*) as total_tagihan,
        COUNT(DISTINCT "pelangganId") as total_warga,
        SUM(jumlah) as total_nominal,
        SUM(COALESCE(denda, 0)) as total_denda
      FROM "Tagihan"
      WHERE ("tenantId" = 'tenant-pilot-upsheru' OR "tenantId" IS NULL)
        AND "deletedAt" IS NULL
      GROUP BY tahun, bulan, status
      ORDER BY tahun DESC, bulan DESC, status ASC;
    `);

    // 2. Query Detail NOPEMBER 2027 (Tahun 2027, Bulan 11)
    const nov2027Res = await client.query(`
      SELECT 
        status, 
        COUNT(*) as total_tagihan,
        COUNT(DISTINCT "pelangganId") as total_warga,
        SUM(jumlah) as total_nominal,
        SUM(COALESCE(denda, 0)) as total_denda
      FROM "Tagihan"
      WHERE tahun = 2027 AND bulan = 11
        AND ("tenantId" = 'tenant-pilot-upsheru' OR "tenantId" IS NULL)
        AND "deletedAt" IS NULL
      GROUP BY status;
    `);

    const nov2027UnpaidList = await client.query(`
      SELECT 
        t.id, 
        t."noInvoice", 
        t.jumlah, 
        t.denda, 
        t.status, 
        p.id as "pelangganId", 
        p."kodePelanggan", 
        p.nama, 
        p."noTelepon", 
        p.alamat, 
        p."rtRw",
        w.nama as wilayah,
        z.nama as zona
      FROM "Tagihan" t
      JOIN "Pelanggan" p ON t."pelangganId" = p.id
      LEFT JOIN "Wilayah" w ON p."wilayahId" = w.id
      LEFT JOIN "Zona" z ON w."zonaId" = z.id
      WHERE t.tahun = 2027 AND t.bulan = 11
        AND t.status IN ('belum_bayar', 'tunggakan')
        AND (t."tenantId" = 'tenant-pilot-upsheru' OR t."tenantId" IS NULL)
        AND t."deletedAt" IS NULL
      ORDER BY p.nama ASC;
    `);

    // 3. Query Detail NOPEMBER 2026 (Tahun 2026, Bulan 11)
    const nov2026Res = await client.query(`
      SELECT 
        status, 
        COUNT(*) as total_tagihan,
        COUNT(DISTINCT "pelangganId") as total_warga,
        SUM(jumlah) as total_nominal,
        SUM(COALESCE(denda, 0)) as total_denda
      FROM "Tagihan"
      WHERE tahun = 2026 AND bulan = 11
        AND ("tenantId" = 'tenant-pilot-upsheru' OR "tenantId" IS NULL)
        AND "deletedAt" IS NULL
      GROUP BY status;
    `);

    const nov2026ZonaBreakdown = await client.query(`
      SELECT 
        COALESCE(z.nama, 'Tanpa Zona') as zona_nama,
        COUNT(t.id) as total_tagihan_belum_bayar,
        COUNT(DISTINCT p.id) as total_warga_belum_bayar,
        SUM(t.jumlah) as total_nominal
      FROM "Tagihan" t
      JOIN "Pelanggan" p ON t."pelangganId" = p.id
      LEFT JOIN "Wilayah" w ON p."wilayahId" = w.id
      LEFT JOIN "Zona" z ON w."zonaId" = z.id
      WHERE t.tahun = 2026 AND t.bulan = 11
        AND t.status IN ('belum_bayar', 'tunggakan')
        AND (t."tenantId" = 'tenant-pilot-upsheru' OR t."tenantId" IS NULL)
        AND t."deletedAt" IS NULL
      GROUP BY z.nama
      ORDER BY total_nominal DESC;
    `);

    const nov2026SampleUnpaid = await client.query(`
      SELECT 
        t.id, 
        t."noInvoice", 
        t.jumlah, 
        t.status, 
        p."kodePelanggan", 
        p.nama, 
        p.alamat, 
        p."rtRw",
        w.nama as wilayah,
        z.nama as zona
      FROM "Tagihan" t
      JOIN "Pelanggan" p ON t."pelangganId" = p.id
      LEFT JOIN "Wilayah" w ON p."wilayahId" = w.id
      LEFT JOIN "Zona" z ON w."zonaId" = z.id
      WHERE t.tahun = 2026 AND t.bulan = 11
        AND t.status IN ('belum_bayar', 'tunggakan')
        AND (t."tenantId" = 'tenant-pilot-upsheru' OR t."tenantId" IS NULL)
        AND t."deletedAt" IS NULL
      ORDER BY p.id ASC
      LIMIT 100;
    `);

    // 4. Query Total Akumulasi Tunggakan UPS HERU Seluruh Bulan
    const totalKumulatifTunggakan = await client.query(`
      SELECT 
        COUNT(t.id) as total_tagihan_tertunggak,
        COUNT(DISTINCT p.id) as total_warga_tertunggak,
        SUM(t.jumlah) as total_pokok,
        SUM(COALESCE(t.denda, 0)) as total_denda,
        SUM(t.jumlah + COALESCE(t.denda, 0)) as total_semua
      FROM "Tagihan" t
      JOIN "Pelanggan" p ON t."pelangganId" = p.id
      WHERE t.status IN ('belum_bayar', 'tunggakan')
        AND (t."tenantId" = 'tenant-pilot-upsheru' OR t."tenantId" IS NULL)
        AND t."deletedAt" IS NULL
        AND p."deletedAt" IS NULL;
    `);

    const report = {
      timestamp: new Date().toISOString(),
      periodsSummary: allPeriodsRes.rows,
      november2027: {
        summary: nov2027Res.rows,
        unpaidCount: nov2027UnpaidList.rows.length,
        unpaidList: nov2027UnpaidList.rows,
      },
      november2026: {
        summary: nov2026Res.rows,
        zonaBreakdown: nov2026ZonaBreakdown.rows,
        sampleUnpaidCount: nov2026SampleUnpaid.rows.length,
        sampleUnpaid: nov2026SampleUnpaid.rows,
      },
      totalKumulatifTunggakan: totalKumulatifTunggakan.rows[0],
    };

    console.log("=== JSON_RESULT_START ===");
    console.log(JSON.stringify(report, null, 2));
    console.log("=== JSON_RESULT_END ===");

    console.log("\n=======================================================");
    console.log("📊 LAPORAN TAGIHAN NOPEMBER 2027:");
    console.log("=======================================================");
    if (nov2027Res.rows.length === 0) {
      console.log("⚠️ Tidak ada record tagihan sama sekali untuk Nopember 2027.");
    } else {
      console.table(nov2027Res.rows);
      console.log(`Jumlah warga belum bayar Nov 2027: ${nov2027UnpaidList.rows.length}`);
    }

    console.log("\n=======================================================");
    console.log("📊 LAPORAN TAGIHAN NOPEMBER 2026 (Bulan Berjalan):");
    console.log("=======================================================");
    console.table(nov2026Res.rows);

    console.log("\n📍 Breakdown Tunggakan Nov 2026 per Zona:");
    console.table(nov2026ZonaBreakdown.rows);

    console.log("\n💰 Total Akumulasi Tunggakan UPS HERU Seluruh Bulan:");
    console.table([totalKumulatifTunggakan.rows[0]]);

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("❌ Execution Error:", err);
  process.exit(1);
});
