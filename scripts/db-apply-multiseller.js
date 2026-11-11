require("dotenv").config();
const { Pool } = require("pg");
const crypto = require("crypto");

const rawConnectionString = process.env.DATABASE_URL?.trim();
const connectionString = rawConnectionString?.replace(/[?&]sslmode=[^&]+/g, "").replace(/\?$/, "");

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

function uuidv4() {
  return crypto.randomUUID();
}

async function main() {
  const client = await pool.connect();
  try {
    console.log("🚀 Menjalankan DDL migrasi Marketplace Multi-Seller...");

    await client.query("BEGIN");

    // 1. SellerProfile
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SellerProfile" (
        "id" SERIAL NOT NULL,
        "uuid" TEXT NOT NULL,
        "userId" INTEGER NOT NULL,
        "namaToko" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "deskripsi" TEXT,
        "logo" TEXT,
        "banner" TEXT,
        "alamat" TEXT NOT NULL,
        "kelurahan" TEXT,
        "kecamatan" TEXT,
        "kota" TEXT NOT NULL DEFAULT 'Kota Depok',
        "noTelepon" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "bankNama" TEXT,
        "bankRekening" TEXT,
        "bankAtasNama" TEXT,
        "saldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "SellerProfile_uuid_key" ON "SellerProfile"("uuid");`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "SellerProfile_userId_key" ON "SellerProfile"("userId");`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "SellerProfile_slug_key" ON "SellerProfile"("slug");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "SellerProfile_status_createdAt_idx" ON "SellerProfile"("status", "createdAt");`);

    // Foreign Key SellerProfile -> User
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'SellerProfile_userId_fkey'
        ) THEN
          ALTER TABLE "SellerProfile" 
          ADD CONSTRAINT "SellerProfile_userId_fkey" 
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 2. Category
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Category" (
        "id" SERIAL NOT NULL,
        "uuid" TEXT NOT NULL,
        "nama" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "deskripsi" TEXT,
        "icon" TEXT,
        "aktif" BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Category_uuid_key" ON "Category"("uuid");`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Category_slug_aktif_idx" ON "Category"("slug", "aktif");`);

    // 3. Product
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Product" (
        "id" SERIAL NOT NULL,
        "uuid" TEXT NOT NULL,
        "sellerId" INTEGER NOT NULL,
        "categoryId" INTEGER NOT NULL,
        "nama" TEXT NOT NULL,
        "slug" TEXT NOT NULL,
        "deskripsi" TEXT NOT NULL,
        "harga" DOUBLE PRECISION NOT NULL,
        "stok" INTEGER NOT NULL DEFAULT 0,
        "satuan" TEXT NOT NULL DEFAULT 'pcs',
        "beratGram" INTEGER NOT NULL DEFAULT 1000,
        "status" TEXT NOT NULL DEFAULT 'aktif',
        "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
        "terjual" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Product_uuid_key" ON "Product"("uuid");`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Product_slug_key" ON "Product"("slug");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Product_sellerId_status_idx" ON "Product"("sellerId", "status");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Product_categoryId_status_idx" ON "Product"("categoryId", "status");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Product_status_createdAt_idx" ON "Product"("status", "createdAt");`);

    // Foreign Keys Product
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Product_sellerId_fkey'
        ) THEN
          ALTER TABLE "Product" 
          ADD CONSTRAINT "Product_sellerId_fkey" 
          FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Product_categoryId_fkey'
        ) THEN
          ALTER TABLE "Product" 
          ADD CONSTRAINT "Product_categoryId_fkey" 
          FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 4. ProductImage
    await client.query(`
      CREATE TABLE IF NOT EXISTS "ProductImage" (
        "id" SERIAL NOT NULL,
        "uuid" TEXT NOT NULL,
        "productId" INTEGER NOT NULL,
        "url" TEXT NOT NULL,
        "urutan" INTEGER NOT NULL DEFAULT 0,
        "isPrimary" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "ProductImage_uuid_key" ON "ProductImage"("uuid");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "ProductImage_productId_urutan_idx" ON "ProductImage"("productId", "urutan");`);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'ProductImage_productId_fkey'
        ) THEN
          ALTER TABLE "ProductImage" 
          ADD CONSTRAINT "ProductImage_productId_fkey" 
          FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 5. Cart
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Cart" (
        "id" SERIAL NOT NULL,
        "uuid" TEXT NOT NULL,
        "userId" INTEGER,
        "sessionId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Cart_uuid_key" ON "Cart"("uuid");`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Cart_sessionId_key" ON "Cart"("sessionId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Cart_userId_idx" ON "Cart"("userId");`);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Cart_userId_fkey'
        ) THEN
          ALTER TABLE "Cart" 
          ADD CONSTRAINT "Cart_userId_fkey" 
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 6. CartItem
    await client.query(`
      CREATE TABLE IF NOT EXISTS "CartItem" (
        "id" SERIAL NOT NULL,
        "cartId" INTEGER NOT NULL,
        "productId" INTEGER NOT NULL,
        "jumlah" INTEGER NOT NULL DEFAULT 1,
        "catatan" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "CartItem_cartId_idx" ON "CartItem"("cartId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "CartItem_productId_idx" ON "CartItem"("productId");`);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'CartItem_cartId_fkey'
        ) THEN
          ALTER TABLE "CartItem" 
          ADD CONSTRAINT "CartItem_cartId_fkey" 
          FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'CartItem_productId_fkey'
        ) THEN
          ALTER TABLE "CartItem" 
          ADD CONSTRAINT "CartItem_productId_fkey" 
          FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 7. Order (Master Order)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Order" (
        "id" SERIAL NOT NULL,
        "uuid" TEXT NOT NULL,
        "noOrder" TEXT NOT NULL,
        "userId" INTEGER,
        "namaPembeli" TEXT NOT NULL,
        "noTelepon" TEXT NOT NULL,
        "email" TEXT,
        "alamatPengiriman" TEXT NOT NULL,
        "kelurahan" TEXT,
        "kecamatan" TEXT,
        "kodePos" TEXT,
        "totalProduk" DOUBLE PRECISION NOT NULL,
        "totalOngkir" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "totalBayar" DOUBLE PRECISION NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending_payment',
        "catatan" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Order_uuid_key" ON "Order"("uuid");`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Order_noOrder_key" ON "Order"("noOrder");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Order_status_createdAt_idx" ON "Order"("status", "createdAt");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Order_noTelepon_idx" ON "Order"("noTelepon");`);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Order_userId_fkey'
        ) THEN
          ALTER TABLE "Order" 
          ADD CONSTRAINT "Order_userId_fkey" 
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 8. SellerOrder (Sub-Order per Penjual)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "SellerOrder" (
        "id" SERIAL NOT NULL,
        "uuid" TEXT NOT NULL,
        "noSubOrder" TEXT NOT NULL,
        "orderId" INTEGER NOT NULL,
        "sellerId" INTEGER NOT NULL,
        "totalHarga" DOUBLE PRECISION NOT NULL,
        "ongkir" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "status" TEXT NOT NULL DEFAULT 'pending_payment',
        "catatanSeller" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "SellerOrder_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "SellerOrder_uuid_key" ON "SellerOrder"("uuid");`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "SellerOrder_noSubOrder_key" ON "SellerOrder"("noSubOrder");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "SellerOrder_orderId_idx" ON "SellerOrder"("orderId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "SellerOrder_sellerId_status_idx" ON "SellerOrder"("sellerId", "status");`);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'SellerOrder_orderId_fkey'
        ) THEN
          ALTER TABLE "SellerOrder" 
          ADD CONSTRAINT "SellerOrder_orderId_fkey" 
          FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'SellerOrder_sellerId_fkey'
        ) THEN
          ALTER TABLE "SellerOrder" 
          ADD CONSTRAINT "SellerOrder_sellerId_fkey" 
          FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 9. OrderItem (Snapshot Item)
    await client.query(`
      CREATE TABLE IF NOT EXISTS "OrderItem" (
        "id" SERIAL NOT NULL,
        "uuid" TEXT NOT NULL,
        "sellerOrderId" INTEGER NOT NULL,
        "productId" INTEGER,
        "namaProduk" TEXT NOT NULL,
        "hargaSatuan" DOUBLE PRECISION NOT NULL,
        "beratGram" INTEGER NOT NULL DEFAULT 1000,
        "satuan" TEXT NOT NULL DEFAULT 'pcs',
        "foto" TEXT,
        "jumlah" INTEGER NOT NULL DEFAULT 1,
        "subtotal" DOUBLE PRECISION NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "OrderItem_uuid_key" ON "OrderItem"("uuid");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "OrderItem_sellerOrderId_idx" ON "OrderItem"("sellerOrderId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "OrderItem_productId_idx" ON "OrderItem"("productId");`);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_sellerOrderId_fkey'
        ) THEN
          ALTER TABLE "OrderItem" 
          ADD CONSTRAINT "OrderItem_sellerOrderId_fkey" 
          FOREIGN KEY ("sellerOrderId") REFERENCES "SellerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'OrderItem_productId_fkey'
        ) THEN
          ALTER TABLE "OrderItem" 
          ADD CONSTRAINT "OrderItem_productId_fkey" 
          FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 10. Payment
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Payment" (
        "id" SERIAL NOT NULL,
        "uuid" TEXT NOT NULL,
        "orderId" INTEGER NOT NULL,
        "noTransaksi" TEXT NOT NULL,
        "metodeBayar" TEXT NOT NULL,
        "nominal" DOUBLE PRECISION NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'pending',
        "gatewayRef" TEXT,
        "vaNumber" TEXT,
        "qrString" TEXT,
        "waktuExpired" TIMESTAMP(3),
        "waktuBayar" TIMESTAMP(3),
        "rawResponse" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Payment_uuid_key" ON "Payment"("uuid");`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Payment_noTransaksi_key" ON "Payment"("noTransaksi");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Payment_orderId_idx" ON "Payment"("orderId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Payment_status_idx" ON "Payment"("status");`);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Payment_orderId_fkey'
        ) THEN
          ALTER TABLE "Payment" 
          ADD CONSTRAINT "Payment_orderId_fkey" 
          FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    // 11. Shipment
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Shipment" (
        "id" SERIAL NOT NULL,
        "uuid" TEXT NOT NULL,
        "sellerOrderId" INTEGER NOT NULL,
        "kurirNama" TEXT NOT NULL DEFAULT 'Kurir Toko',
        "noResi" TEXT,
        "ongkir" DOUBLE PRECISION NOT NULL DEFAULT 0,
        "estimasiTiba" TEXT,
        "status" TEXT NOT NULL DEFAULT 'menunggu_dikirim',
        "dikirimAt" TIMESTAMP(3),
        "diterimaAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
      );
    `);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Shipment_uuid_key" ON "Shipment"("uuid");`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "Shipment_sellerOrderId_key" ON "Shipment"("sellerOrderId");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Shipment_status_idx" ON "Shipment"("status");`);
    await client.query(`CREATE INDEX IF NOT EXISTS "Shipment_noResi_idx" ON "Shipment"("noResi");`);

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'Shipment_sellerOrderId_fkey'
        ) THEN
          ALTER TABLE "Shipment" 
          ADD CONSTRAINT "Shipment_sellerOrderId_fkey" 
          FOREIGN KEY ("sellerOrderId") REFERENCES "SellerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    await client.query("COMMIT");
    console.log("✅ DDL migrasi Marketplace Multi-Seller selesai!");

    // SEEDING DATA
    console.log("🌱 Menjalankan Seeding: 3 Seller, 5 Kategori, 20 Produk...");

    // 1. Seed 5 Kategori
    const categoriesData = [
      {
        nama: "Pupuk & Kompos Organik",
        slug: "pupuk-kompos-organik",
        deskripsi: "Pupuk organik padat, kompos matang, dan kascing hasil fermentasi sampah terpilah.",
        icon: "Leaf",
      },
      {
        nama: "Pakan & Biokonversi BSF",
        slug: "pakan-biokonversi-bsf",
        deskripsi: "Maggot BSF kering, larva segar, dan tepung pakan ternak tinggi protein.",
        icon: "Bug",
      },
      {
        nama: "Kerajinan & Daur Ulang",
        slug: "kerajinan-daur-ulang",
        deskripsi: "Produk kreasi bernilai guna dari limbah plastik, kertas semen, dan ban bekas.",
        icon: "Sparkles",
      },
      {
        nama: "Wadah & Tempat Sampah",
        slug: "tempat-sampah-terpilah",
        deskripsi: "Tong sampah pilah 2-in-1, komposter mini rumahan, dan keranjang terpilah.",
        icon: "Trash2",
      },
      {
        nama: "Kemasan Ramah Lingkungan",
        slug: "kemasan-ramah-lingkungan",
        deskripsi: "Kantong biodegradable berbahan singkong, tas belanja spunbond, dan kemasan daur ulang.",
        icon: "ShoppingBag",
      },
    ];

    const categoryIdMap = {};
    for (const cat of categoriesData) {
      const res = await client.query(
        `INSERT INTO "Category" ("uuid", "nama", "slug", "deskripsi", "icon", "aktif", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, true, NOW())
         ON CONFLICT ("slug") DO UPDATE SET "nama" = EXCLUDED."nama", "deskripsi" = EXCLUDED."deskripsi"
         RETURNING "id", "slug"`,
        [uuidv4(), cat.nama, cat.slug, cat.deskripsi, cat.icon]
      );
      categoryIdMap[cat.slug] = res.rows[0].id;
    }

    // 2. Seed 3 Seller Users & Profiles
    const bcrypt = require("bcryptjs");
    const defaultPassword = await bcrypt.hash("SellerDepok2026!", 10);

    const sellersData = [
      {
        user: {
          email: "tps3r.kalibaru@wastepay.id",
          nama: "Official UPS HERU TPS 3R",
          role: "seller",
          noTelepon: "081400782617",
        },
        profile: {
          namaToko: "Toko Resmi UPS HERU Kalibaru",
          slug: "tps3r-kalibaru-resmi",
          deskripsi: "Fasilitas Pengolahan Sampah Terpadu 3R Kelurahan Kalibaru Kota Depok. Menghasilkan pupuk kompos berkualitas tinggi dan bio-nutrisi tanaman.",
          alamat: "Jl. H. Asmawi No. 12, RT 03/RW 05, Kalibaru, Cilodong",
          kelurahan: "Kalibaru",
          kecamatan: "Cilodong",
          noTelepon: "081400782617",
          status: "aktif",
          bankNama: "Bank BJB",
          bankRekening: "0123456789001",
          bankAtasNama: "UPS HERU KALIBARU",
          rating: 4.9,
          logo: "/ups-heru-logo.jpg",
        },
      },
      {
        user: {
          email: "bsu.berkah@wastepay.id",
          nama: "Pengurus BSU Berkah Mandiri",
          role: "seller",
          noTelepon: "081298765432",
        },
        profile: {
          namaToko: "Bank Sampah Berkah Mandiri",
          slug: "bank-sampah-berkah-mandiri",
          deskripsi: "Pusat kreasi pilah sampah dan biokonversi maggot BSF lingkungan RW 08 Cilodong. Menyediakan pakan ternak tinggi protein dan pupuk kascing.",
          alamat: "Komplek Taman Cilodong Indah Blok B4/12",
          kelurahan: "Cilodong",
          kecamatan: "Cilodong",
          noTelepon: "081298765432",
          status: "aktif",
          bankNama: "Bank BCA",
          bankRekening: "8820192831",
          bankAtasNama: "KSM BERKAH MANDIRI",
          rating: 4.8,
          logo: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=300&q=80",
        },
      },
      {
        user: {
          email: "kreasi.depok@wastepay.id",
          nama: "UMKM Depok Kreatif Daur Ulang",
          role: "seller",
          noTelepon: "085712345678",
        },
        profile: {
          namaToko: "Kreasi Daur Ulang Depok Kreatif",
          slug: "kreasi-daur-ulang-depok",
          deskripsi: "Sentra kerajinan daur ulang limbah plastik bungkus kopi, sachet, dan kertas semen. Menghasilkan tas belanja unik, dompet, dan pot tanaman artistik.",
          alamat: "Jl. Raya Citayam No. 45, Beji, Kota Depok",
          kelurahan: "Beji",
          kecamatan: "Beji",
          noTelepon: "085712345678",
          status: "aktif",
          bankNama: "Bank Mandiri",
          bankRekening: "1570009821234",
          bankAtasNama: "KREASI DEPOK KREATIF",
          rating: 4.9,
          logo: "https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=300&q=80",
        },
      },
    ];

    const sellerIdMap = {};
    for (const s of sellersData) {
      let userRes = await client.query(`SELECT "id" FROM "User" WHERE "email" = $1`, [s.user.email]);
      let uId;
      if (userRes.rows.length === 0) {
        userRes = await client.query(
          `INSERT INTO "User" ("email", "password", "nama", "role", "noTelepon", "aktif", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, true, NOW())
           RETURNING "id"`,
          [s.user.email, defaultPassword, s.user.nama, s.user.role, s.user.noTelepon]
        );
        uId = userRes.rows[0].id;
      } else {
        uId = userRes.rows[0].id;
      }

      const p = s.profile;
      const profRes = await client.query(
        `INSERT INTO "SellerProfile" ("uuid", "userId", "namaToko", "slug", "deskripsi", "alamat", "kelurahan", "kecamatan", "kota", "noTelepon", "status", "bankNama", "bankRekening", "bankAtasNama", "rating", "logo", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
         ON CONFLICT ("slug") DO UPDATE SET "namaToko" = EXCLUDED."namaToko", "deskripsi" = EXCLUDED."deskripsi", "status" = EXCLUDED."status"
         RETURNING "id", "slug"`,
        [uuidv4(), uId, p.namaToko, p.slug, p.deskripsi, p.alamat, p.kelurahan, p.kecamatan, p.kota || "Kota Depok", p.noTelepon, p.status, p.bankNama, p.bankRekening, p.bankAtasNama, p.rating, p.logo]
      );
      sellerIdMap[p.slug] = profRes.rows[0].id;
    }

    // 3. Seed 20 Produk Lengkap
    const productsData = [
      // Seller 1: Toko Resmi UPS HERU Kalibaru
      {
        sellerSlug: "tps3r-kalibaru-resmi",
        catSlug: "pupuk-kompos-organik",
        nama: "Pupuk Kompos Organik TPS 3R (5 kg)",
        slug: "pupuk-kompos-organik-5kg-resmi",
        harga: 25000,
        stok: 120,
        satuan: "sak",
        beratGram: 5000,
        deskripsi: "Pupuk kompos kaya unsur hara makro & mikro hasil fermentasi aerob sampah daun dan sisa makanan dapur warga Depok di TPS 3R Kalibaru.",
        foto: "https://images.unsplash.com/photo-1585336261026-699708785089?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "tps3r-kalibaru-resmi",
        catSlug: "pupuk-kompos-organik",
        nama: "Pupuk Kompos Organik Curah (20 kg)",
        slug: "pupuk-kompos-curah-20kg-resmi",
        harga: 75000,
        stok: 60,
        satuan: "sak",
        beratGram: 20000,
        deskripsi: "Kemasan ekonomis karung besar 20 kg. Cocok untuk kebun pekarangan luas, tanaman buah dalam pot (tabulampot), dan landscape perumahan.",
        foto: "https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "tps3r-kalibaru-resmi",
        catSlug: "pupuk-kompos-organik",
        nama: "Pupuk Organik Cair (POC) Bio-Nutrisi (1 Liter)",
        slug: "poc-bio-nutrisi-1l-resmi",
        harga: 35000,
        stok: 85,
        satuan: "botol",
        beratGram: 1000,
        deskripsi: "Ekstrak nutrisi cair hasil filtrasi fermentasi kompos aktif. Mengandung mikroba pemacu pertumbuhan (EM4 alami) siap semprot daun dan kocor akar.",
        foto: "https://images.unsplash.com/photo-1523348837708-15d4a09cfac2?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "tps3r-kalibaru-resmi",
        catSlug: "pupuk-kompos-organik",
        nama: "Pupuk Organik Cair (POC) Jerigen (5 Liter)",
        slug: "poc-bio-nutrisi-5l-resmi",
        harga: 140000,
        stok: 30,
        satuan: "jerigen",
        beratGram: 5000,
        deskripsi: "Kemasan jerigen 5L hemat untuk komunitas hidroponik, petani sayur perkotaan, dan nursery tanaman hias.",
        foto: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "tps3r-kalibaru-resmi",
        catSlug: "tempat-sampah-terpilah",
        nama: "Tong Sampah Pilah 2-in-1 Pedal (2x20 Liter)",
        slug: "tong-sampah-pilah-2in1-pedal",
        harga: 120000,
        stok: 40,
        satuan: "set",
        beratGram: 2500,
        deskripsi: "Tempat sampah dua sekat (Hijau Organik & Biru Anorganik) bertutup pedal higienis. Mempermudah pemilahan dari dapur sebelum dijemput armada.",
        foto: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "tps3r-kalibaru-resmi",
        catSlug: "tempat-sampah-terpilah",
        nama: "Tong Komposter Mini Aerob Dapur (25 Liter)",
        slug: "tong-komposter-mini-dapur-25l",
        harga: 135000,
        stok: 25,
        satuan: "unit",
        beratGram: 3000,
        deskripsi: "Ember komposter dengan saringan dasar dan kran lindi. Mampu mengolah sampah sisa sayur dapur menjadi pupuk cair dan kompos tanpa bau busuk.",
        foto: "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "tps3r-kalibaru-resmi",
        catSlug: "kemasan-ramah-lingkungan",
        nama: "Kantong Sampah Biodegradable Pati Singkong (Roll 30 pcs)",
        slug: "kantong-sampah-biodegradable-singkong",
        harga: 28000,
        stok: 250,
        satuan: "roll",
        beratGram: 350,
        deskripsi: "Kantong sampah ramah lingkungan berbahan 100% cassava starch. Terurai secara alami dalam tanah dalam 180 hari tanpa meninggalkan mikroplastik.",
        foto: "https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=600&q=80",
      },

      // Seller 2: Bank Sampah Berkah Mandiri (BSU)
      {
        sellerSlug: "bank-sampah-berkah-mandiri",
        catSlug: "pakan-biokonversi-bsf",
        nama: "Maggot BSF Kering / Dried Maggot (500 gram)",
        slug: "maggot-bsf-kering-500g-bsu",
        harga: 45000,
        stok: 75,
        satuan: "pouch",
        beratGram: 500,
        deskripsi: "Pakan berprotein tinggi 45%+ untuk ikan koi, channa, lele, burung kicau, dan unggas. Diproses oven higienis bebas kuman.",
        foto: "https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "bank-sampah-berkah-mandiri",
        catSlug: "pakan-biokonversi-bsf",
        nama: "Maggot BSF Kering Pouch Ekonomis (1 Kg)",
        slug: "maggot-bsf-kering-1kg-bsu",
        harga: 80000,
        stok: 50,
        satuan: "pouch",
        beratGram: 1000,
        deskripsi: "Pouch kemasan 1 kg ziplock kedap udara. Menjaga kerenyahan dan aroma pakan alami larva lalat tentara hitam.",
        foto: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "bank-sampah-berkah-mandiri",
        catSlug: "pakan-biokonversi-bsf",
        nama: "Larva Maggot BSF Hidup / Segar (1 Kg)",
        slug: "maggot-bsf-segar-1kg-bsu",
        harga: 25000,
        stok: 40,
        satuan: "kg",
        beratGram: 1000,
        deskripsi: "Maggot hidup aktif kaya kalsium dan asam amino. Pilihan terbaik untuk pakan hidup ikan hias predator dan induk ayam petelur.",
        foto: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "bank-sampah-berkah-mandiri",
        catSlug: "pakan-biokonversi-bsf",
        nama: "Telur BSF (Black Soldier Fly) Super (10 gram)",
        slug: "telur-bsf-super-10g",
        harga: 50000,
        stok: 30,
        satuan: "gram",
        beratGram: 50,
        deskripsi: "Telur lalat tentara hitam siap tetas dengan tingkat daya tetas di atas 90%. Cocok untuk peternak pemula budidaya biokonversi sampah.",
        foto: "https://images.unsplash.com/photo-1516467508483-a7212febe31a?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "bank-sampah-berkah-mandiri",
        catSlug: "pupuk-kompos-organik",
        nama: "Pupuk Kascing Organik (Bekas Cacing) 5 kg",
        slug: "pupuk-kascing-organik-5kg",
        harga: 30000,
        stok: 65,
        satuan: "sak",
        beratGram: 5000,
        deskripsi: "Pupuk organik terbaik hasil dekomposisi cacing tanah jenis Lumbricus. Mengandung enzim dan hormon pemacu pertumbuhan akar.",
        foto: "https://images.unsplash.com/photo-1585336261026-699708785089?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "bank-sampah-berkah-mandiri",
        catSlug: "pupuk-kompos-organik",
        nama: "Pupuk Frass BSF (Residu Pakan Maggot) 5 kg",
        slug: "pupuk-frass-maggot-5kg",
        harga: 22000,
        stok: 90,
        satuan: "sak",
        beratGram: 5000,
        deskripsi: "Sisa olahan residu media pakan maggot kaya nitrogen dan kitin alami yang meningkatkan ketahanan tanaman terhadap hama.",
        foto: "https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "bank-sampah-berkah-mandiri",
        catSlug: "tempat-sampah-terpilah",
        nama: "Keranjang Pilah Anorganik Rumah Tangga (3 Kompartemen)",
        slug: "keranjang-pilah-anorganik-3-sekat",
        harga: 85000,
        stok: 35,
        satuan: "set",
        beratGram: 1800,
        deskripsi: "Set keranjang anyam bahan daur ulang untuk memilah botol PET, kardus/kertas, dan kaleng/besi sebelum ditimbang ke Bank Sampah.",
        foto: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80",
      },

      // Seller 3: Kreasi Daur Ulang Depok Kreatif
      {
        sellerSlug: "kreasi-daur-ulang-depok",
        catSlug: "kerajinan-daur-ulang",
        nama: "Tas Belanja Cantik Daur Ulang Kemasan Kopi",
        slug: "tas-belanja-daur-ulang-bungkus-kopi",
        harga: 65000,
        stok: 40,
        satuan: "pcs",
        beratGram: 400,
        deskripsi: "Tote bag belanja anyaman tangan kuat dan tahan air dari 150+ sachet bungkus kopi terpilah. Modis, tahan lama, dan ramah lingkungan.",
        foto: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "kreasi-daur-ulang-depok",
        catSlug: "kerajinan-daur-ulang",
        nama: "Pot Tanaman Artistik Limbah Ban Bekas",
        slug: "pot-tanaman-daur-ulang-ban",
        harga: 45000,
        stok: 25,
        satuan: "unit",
        beratGram: 2500,
        deskripsi: "Pot bunga tanaman hias unik yang dibentuk dan dicat motif flora dari ban luar motor/mobil bekas. Tahan cuaca panas dan hujan.",
        foto: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "kreasi-daur-ulang-depok",
        catSlug: "kerajinan-daur-ulang",
        nama: "Tempat Pensil & Wadah Meja Koran Bekas",
        slug: "tempat-pensil-anyaman-koran",
        harga: 25000,
        stok: 50,
        satuan: "pcs",
        beratGram: 200,
        deskripsi: "Wadah serbaguna meja kerja dari lintingan koran bekas dilapisi vernis tahan air. Kuat, kokoh, dan berkesan vintage etnik.",
        foto: "https://images.unsplash.com/photo-1584824486509-112e4181ff6b?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "kreasi-daur-ulang-depok",
        catSlug: "kerajinan-daur-ulang",
        nama: "Dompet Lipat Cantik Bungkus Plastik Sachet",
        slug: "dompet-lipat-daur-ulang-sachet",
        harga: 35000,
        stok: 60,
        satuan: "pcs",
        beratGram: 150,
        deskripsi: "Dompet serbaguna dengan resleting rapi hasil jahit kreatif kader bank sampah. Membantu mengurangi residu plastik kemasan sachet.",
        foto: "https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "kreasi-daur-ulang-depok",
        catSlug: "kemasan-ramah-lingkungan",
        nama: "Tas Belanja Spunbond Eco-Friendly Depok Bebas Plastik",
        slug: "tas-spunbond-eco-depok-bebas-plastik",
        harga: 12000,
        stok: 300,
        satuan: "pcs",
        beratGram: 80,
        deskripsi: "Tas belanja kain spunbond 75 gsm kuat menahan beban hingga 10 kg. Dapat dicuci dan digunakan berulang kali untuk belanja pasar.",
        foto: "https://images.unsplash.com/photo-1597733336794-12d05021d510?auto=format&fit=crop&w=600&q=80",
      },
      {
        sellerSlug: "kreasi-daur-ulang-depok",
        catSlug: "kemasan-ramah-lingkungan",
        nama: "Paper Bag Daur Ulang Kertas Semen (Paket isi 10)",
        slug: "paper-bag-kertas-semen-isi-10",
        harga: 25000,
        stok: 120,
        satuan: "paket",
        beratGram: 500,
        deskripsi: "Paper bag tebal dan estetik berwarna cokelat kraft alami yang diproduksi dari kertas zak semen bersih tanpa residu.",
        foto: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80",
      },
    ];

    for (const p of productsData) {
      const sId = sellerIdMap[p.sellerSlug];
      const cId = categoryIdMap[p.catSlug];

      const prodRes = await client.query(
        `INSERT INTO "Product" ("uuid", "sellerId", "categoryId", "nama", "slug", "deskripsi", "harga", "stok", "satuan", "beratGram", "status", "rating", "terjual", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'aktif', 4.9, 5, NOW())
         ON CONFLICT ("slug") DO UPDATE SET
           "harga" = EXCLUDED."harga",
           "stok" = EXCLUDED."stok",
           "deskripsi" = EXCLUDED."deskripsi"
         RETURNING "id"`,
        [uuidv4(), sId, cId, p.nama, p.slug, p.deskripsi, p.harga, p.stok, p.satuan, p.beratGram]
      );

      const prodId = prodRes.rows[0].id;

      // Seed Primary ProductImage
      if (p.foto) {
        await client.query(
          `INSERT INTO "ProductImage" ("uuid", "productId", "url", "urutan", "isPrimary")
           VALUES ($1, $2, $3, 0, true)
           ON CONFLICT DO NOTHING`,
          [uuidv4(), prodId, p.foto]
        );
      }
    }

    console.log("✅ Berhasil seeding 3 Seller, 5 Kategori, dan 20 Produk Multi-Seller!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Gagal migrasi:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
