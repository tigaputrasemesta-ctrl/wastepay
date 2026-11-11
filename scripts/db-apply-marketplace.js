require("dotenv").config();
const { Pool } = require("pg");

const rawConnectionString = process.env.DATABASE_URL?.trim();
const connectionString = rawConnectionString?.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("🚀 Menjalankan DDL migrasi Marketplace & Layanan Pickup...");

    await client.query("BEGIN");

    // 1. Tabel Produk
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Produk" (
        "id" SERIAL NOT NULL,
        "nama" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "kategori" TEXT NOT NULL,
        "harga" DOUBLE PRECISION NOT NULL,
        "stok" INTEGER NOT NULL DEFAULT 0,
        "satuan" TEXT NOT NULL DEFAULT 'sak',
        "beratGram" INTEGER NOT NULL DEFAULT 1000,
        "deskripsi" TEXT NOT NULL,
        "foto" TEXT,
        "aktif" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Produk_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Produk_slug_key" ON "Produk"("slug");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Produk_kategori_aktif_idx" ON "Produk"("kategori", "aktif");`);

    // 2. Tabel MarketplaceOrder
    await client.query(`
      CREATE TABLE IF NOT EXISTS "MarketplaceOrder" (
        "id" SERIAL NOT NULL,
        "noPesanan" TEXT NOT NULL,
        "namaPembeli" TEXT NOT NULL,
        "noTelepon" TEXT NOT NULL,
        "email" TEXT,
        "alamat" TEXT NOT NULL,
        "kelurahan" TEXT,
        "kecamatan" TEXT,
        "catatan" TEXT,
        "totalHarga" DOUBLE PRECISION NOT NULL,
        "ongkir" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'menunggu_pembayaran',
        "metodeBayar" TEXT NOT NULL,
        "buktiBayar" TEXT,
        "tanggalBayar" TIMESTAMP(3),
        "kurirNama" TEXT,
        "noResi" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MarketplaceOrder_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "MarketplaceOrder_noPesanan_key" ON "MarketplaceOrder"("noPesanan");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "MarketplaceOrder_status_createdAt_idx" ON "MarketplaceOrder"("status", "createdAt");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "MarketplaceOrder_noTelepon_idx" ON "MarketplaceOrder"("noTelepon");`);

    // 3. Tabel MarketplaceOrderItem
    await client.query(`
      CREATE TABLE IF NOT EXISTS "MarketplaceOrderItem" (
        "id" SERIAL NOT NULL,
        "orderId" INTEGER NOT NULL,
        "produkId" INTEGER NOT NULL,
        "jumlah" INTEGER NOT NULL,
        "hargaSatuan" DOUBLE PRECISION NOT NULL,
        "subtotal" DOUBLE PRECISION NOT NULL,
        CONSTRAINT "MarketplaceOrderItem_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "MarketplaceOrderItem_orderId_idx" ON "MarketplaceOrderItem"("orderId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "MarketplaceOrderItem_produkId_idx" ON "MarketplaceOrderItem"("produkId");`);

    // Foreign keys MarketplaceOrderItem
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'MarketplaceOrderItem_orderId_fkey'
        ) THEN
          ALTER TABLE "MarketplaceOrderItem" 
          ADD CONSTRAINT "MarketplaceOrderItem_orderId_fkey" 
          FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'MarketplaceOrderItem_produkId_fkey'
        ) THEN
          ALTER TABLE "MarketplaceOrderItem" 
          ADD CONSTRAINT "MarketplaceOrderItem_produkId_fkey" 
          FOREIGN KEY ("produkId") REFERENCES "Produk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 4. Tabel KategoriPickup
    await client.query(`
      CREATE TABLE IF NOT EXISTS "KategoriPickup" (
        "id" SERIAL NOT NULL,
        "kode" TEXT NOT NULL,
        "nama" TEXT NOT NULL,
        "deskripsi" TEXT,
        "satuanMuatan" TEXT NOT NULL,
        "tarifDasar" DOUBLE PRECISION NOT NULL,
        "tarifPerUnit" DOUBLE PRECISION,
        "armadaStandar" TEXT,
        "icon" TEXT,
        "aktif" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "KategoriPickup_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "KategoriPickup_kode_key" ON "KategoriPickup"("kode");`);

    // 5. Tabel PesananPickup
    await client.query(`
      CREATE TABLE IF NOT EXISTS "PesananPickup" (
        "id" SERIAL NOT NULL,
        "noOrder" TEXT NOT NULL,
        "namaPemesan" TEXT NOT NULL,
        "noTelepon" TEXT NOT NULL,
        "alamat" TEXT NOT NULL,
        "patokan" TEXT,
        "kelurahan" TEXT,
        "kecamatan" TEXT,
        "latitude" DOUBLE PRECISION,
        "longitude" DOUBLE PRECISION,
        "kategoriPickupId" INTEGER NOT NULL,
        "estimasiMuatan" TEXT NOT NULL,
        "fotoSampah" TEXT,
        "tanggalJemput" TIMESTAMP(3) NOT NULL,
        "waktuJemput" TEXT,
        "estimasiBiaya" DOUBLE PRECISION NOT NULL,
        "biayaFinal" DOUBLE PRECISION,
        "metodeBayar" TEXT NOT NULL DEFAULT 'cod',
        "statusBayar" TEXT NOT NULL DEFAULT 'belum_bayar',
        "buktiBayar" TEXT,
        "status" TEXT NOT NULL DEFAULT 'menunggu_konfirmasi',
        "catatanPetugas" TEXT,
        "fotoSelesai" TEXT,
        "petugasId" INTEGER,
        "kendaraanId" INTEGER,
        "pelangganId" INTEGER,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "selesaiAt" TIMESTAMP(3),
        CONSTRAINT "PesananPickup_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "PesananPickup_noOrder_key" ON "PesananPickup"("noOrder");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "PesananPickup_status_tanggalJemput_idx" ON "PesananPickup"("status", "tanggalJemput");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "PesananPickup_noTelepon_idx" ON "PesananPickup"("noTelepon");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "PesananPickup_petugasId_idx" ON "PesananPickup"("petugasId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "PesananPickup_kategoriPickupId_idx" ON "PesananPickup"("kategoriPickupId");`);

    // Foreign keys PesananPickup
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'PesananPickup_kategoriPickupId_fkey'
        ) THEN
          ALTER TABLE "PesananPickup" 
          ADD CONSTRAINT "PesananPickup_kategoriPickupId_fkey" 
          FOREIGN KEY ("kategoriPickupId") REFERENCES "KategoriPickup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'PesananPickup_petugasId_fkey'
        ) THEN
          ALTER TABLE "PesananPickup" 
          ADD CONSTRAINT "PesananPickup_petugasId_fkey" 
          FOREIGN KEY ("petugasId") REFERENCES "Petugas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'PesananPickup_kendaraanId_fkey'
        ) THEN
          ALTER TABLE "PesananPickup" 
          ADD CONSTRAINT "PesananPickup_kendaraanId_fkey" 
          FOREIGN KEY ("kendaraanId") REFERENCES "Kendaraan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'PesananPickup_pelangganId_fkey'
        ) THEN
          ALTER TABLE "PesananPickup" 
          ADD CONSTRAINT "PesananPickup_pelangganId_fkey" 
          FOREIGN KEY ("pelangganId") REFERENCES "Pelanggan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // ==========================================
    // SEEDING DATA DEFAULT
    // ==========================================
    console.log("🌱 Melakukan seeding data awal Kategori Pickup...");
    const kategoriPickupData = [
      {
        kode: "puing",
        nama: "Puing Bangunan & Renovasi",
        deskripsi: "Puing sisa pecahan semen, batu bata, keramik, dan genteng renovasi rumah",
        satuanMuatan: "karung / rit",
        tarifDasar: 100000,
        tarifPerUnit: 15000,
        armadaStandar: "pickup",
        icon: "Hammer"
      },
      {
        kode: "ranting",
        nama: "Ranting Pohon & Sampah Taman",
        deskripsi: "Dahan, daun rontok, ranting kebun, potongan pohon, dan rumput liar",
        satuanMuatan: "rit pikap / ikat",
        tarifDasar: 85000,
        tarifPerUnit: 10000,
        armadaStandar: "pickup",
        icon: "Trees"
      },
      {
        kode: "bulky",
        nama: "Barang Besar / Bulky Waste",
        deskripsi: "Kasur busa, springbed, sofa, lemari, meja makan, perabot tua, dan barang rusak besar",
        satuanMuatan: "unit barang",
        tarifDasar: 75000,
        tarifPerUnit: 25000,
        armadaStandar: "pickup",
        icon: "Armchair"
      },
      {
        kode: "event",
        nama: "Sampah Acara & Pesta",
        deskripsi: "Sampah sisa hajatan keluarga, pesta pernikahan, bazaar, atau festival",
        satuanMuatan: "paket acara",
        tarifDasar: 200000,
        tarifPerUnit: 50000,
        armadaStandar: "dump_truck",
        icon: "PartyPopper"
      },
      {
        kode: "ewaste",
        nama: "Limbah Elektronik (E-Waste)",
        deskripsi: "Kulkas rusak, mesin cuci, monitor, printer, TV, kabel, dan perangkat elektronik",
        satuanMuatan: "unit / perangkat",
        tarifDasar: 50000,
        tarifPerUnit: 15000,
        armadaStandar: "tossa",
        icon: "Tv"
      }
    ];

    for (const item of kategoriPickupData) {
      await client.query(`
        INSERT INTO "KategoriPickup" ("kode", "nama", "deskripsi", "satuanMuatan", "tarifDasar", "tarifPerUnit", "armadaStandar", "icon", "aktif", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
        ON CONFLICT ("kode") DO UPDATE SET
          "nama" = EXCLUDED."nama",
          "deskripsi" = EXCLUDED."deskripsi",
          "satuanMuatan" = EXCLUDED."satuanMuatan",
          "tarifDasar" = EXCLUDED."tarifDasar",
          "tarifPerUnit" = EXCLUDED."tarifPerUnit",
          "armadaStandar" = EXCLUDED."armadaStandar",
          "icon" = EXCLUDED."icon",
          "updatedAt" = NOW();
      `, [item.kode, item.nama, item.deskripsi, item.satuanMuatan, item.tarifDasar, item.tarifPerUnit, item.armadaStandar, item.icon]);
    }

    console.log("🌱 Melakukan seeding data awal Produk Resmi UPS HERU...");
    const produkData = [
      {
        nama: "Pupuk Kompos Organik TPS 3R (5 kg)",
        slug: "pupuk-kompos-organik-5kg",
        kategori: "pupuk_kompos",
        harga: 25000,
        stok: 150,
        satuan: "sak",
        beratGram: 5000,
        deskripsi: "Pupuk organik kaya unsur hara makro & mikro hasil fermentasi sampah organik rumah tangga terpilah di TPS 3R Kalibaru. Menggemburkan tanah, menjaga kelembapan, dan menyuburkan tanaman bunga, buah, serta sayuran pekarangan.",
        foto: "https://images.unsplash.com/photo-1585336261026-699708785089?auto=format&fit=crop&w=600&q=80"
      },
      {
        nama: "Pupuk Kompos Super Curah (20 kg)",
        slug: "pupuk-kompos-super-20kg",
        kategori: "pupuk_kompos",
        harga: 75000,
        stok: 80,
        satuan: "sak",
        beratGram: 20000,
        deskripsi: "Kemasan hemat 20 kg untuk kebun luas, pekarangan rumah, perkebunan hidroponik, dan taman perumahan. Diproses secara matang dan bebas biji gulma.",
        foto: "https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&w=600&q=80"
      },
      {
        nama: "Pupuk Organik Cair (POC) Bio-Nutrisi (1 Liter)",
        slug: "poc-nutrisi-tanaman-1l",
        kategori: "pupuk_cair",
        harga: 35000,
        stok: 60,
        satuan: "botol",
        beratGram: 1000,
        deskripsi: "Konsentrat nutrisi cair mikroorganisme baik (EM4 & fermentasi lindi terfilter) siap campur air untuk semprot daun dan kocor akar tanaman hias dan sayur.",
        foto: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=600&q=80"
      },
      {
        nama: "Maggot BSF Kering Protein Tinggi (500 gram)",
        slug: "maggot-bsf-kering-500g",
        kategori: "maggot",
        harga: 45000,
        stok: 90,
        satuan: "pouch",
        beratGram: 500,
        deskripsi: "Pakan berprotein tinggi 45%+ untuk ikan koi, lele, burung kicau, dan unggas. Diproduksi dari biokonversi sampah organik sisa makanan dapur yang bersih dan higienis.",
        foto: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=600&q=80"
      },
      {
        nama: "Tempat Sampah Pilah 2-in-1 Organik & Anorganik",
        slug: "tempat-sampah-pilah-2in1",
        kategori: "tempat_sampah",
        harga: 120000,
        stok: 35,
        satuan: "set",
        beratGram: 2500,
        deskripsi: "Tempat sampah dua kompartemen (Hijau untuk organik & Biru untuk anorganik) bertutup pedal higienis berkapasitas 2x20 liter. Mempermudah pemilahan sampah langsung dari dapur keluarga.",
        foto: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80"
      },
      {
        nama: "Kantong Sampah Ramah Lingkungan Biodegradable (Roll isi 30)",
        slug: "kantong-sampah-biodegradable-roll",
        kategori: "kantong_sampah",
        harga: 28000,
        stok: 200,
        satuan: "roll",
        beratGram: 300,
        deskripsi: "Kantong sampah ramah lingkungan berbahan sari pati singkong (cassava starch) yang dapat terurai alami dalam tanah dalam waktu 180 hari tanpa meninggalkan mikroplastik.",
        foto: "https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=600&q=80"
      }
    ];

    for (const p of produkData) {
      await client.query(`
        INSERT INTO "Produk" ("nama", "slug", "kategori", "harga", "stok", "satuan", "beratGram", "deskripsi", "foto", "aktif", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW())
        ON CONFLICT ("slug") DO UPDATE SET
          "nama" = EXCLUDED."nama",
          "kategori" = EXCLUDED."kategori",
          "harga" = EXCLUDED."harga",
          "stok" = EXCLUDED."stok",
          "satuan" = EXCLUDED."satuan",
          "beratGram" = EXCLUDED."beratGram",
          "deskripsi" = EXCLUDED."deskripsi",
          "foto" = EXCLUDED."foto",
          "updatedAt" = NOW();
      `, [p.nama, p.slug, p.kategori, p.harga, p.stok, p.satuan, p.beratGram, p.deskripsi, p.foto]);
    }

    await client.query("COMMIT");
    console.log("✅ DDL & Seeding Marketplace & Layanan Pickup BERHASIL diterapkan ke database!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Gagal menerapkan DDL / Seeding:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
