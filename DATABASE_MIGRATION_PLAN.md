# DATABASE_MIGRATION_PLAN.md: Rencana Migrasi Skema Basis Data Zero-Downtime
> **Platform**: O2W HERO Multi-Tenant SaaS  
> **Engine**: PostgreSQL 16+ & Prisma ORM  
> **Target**: Skema Hibrida (Shared RLS + Dedicated Enterprise)  
> **Status**: Rencana Terverifikasi (Non-Destructive)

---

## 1. Pendekatan Migrasi Zero-Downtime (Phased Strategy)

Untuk memastikan operasional harian UPS HERU (penarikan sampah, pembayaran QRIS warga, pencatatan supir) tidak terganggu sedetik pun saat migrasi ke multi-tenant, proses migrasi skema basis data dibagi menjadi **3 Fase Terkendali**:

```mermaid
flowchart LR
    Phase1["Fase 1: Additive Schema<br/>(Kolom Nullable & Index Baru)"] --> Phase2["Fase 2: Data Backfill<br/>(Tandai Seluruh Data Lama ke Pilot)"]
    Phase2 --> Phase3["Fase 3: RLS & Hard Constraint<br/>(Aktifkan RLS & Composite Index)"]
```

---

## 2. Rincian Perubahan Skema Prisma (`prisma/schema.prisma`)

### A. Penambahan `tenantId` pada Model Kritis

#### 1. Model `Tagihan` (Sebelumnya Hilang)
```prisma
model Tagihan {
  id              Int          @id @default(autoincrement())
  noInvoice       String       @unique
  pelangganId     Int
  pelanggan       Pelanggan    @relation(fields: [pelangganId], references: [id], onDelete: Cascade)
  
  // PENAMBAHAN MULTI-TENANT:
  tenantId        String?
  tenant          Tenant?      @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  periode         DateTime     @db.Date
  nominal         Decimal      @db.Decimal(12, 2)
  status          String       @default("belum_bayar") // belum_bayar | lunas | batal
  jatuhTempo      DateTime     @db.Date
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  pembayaran      Pembayaran[]

  @@index([tenantId, status, periode])
  @@index([tenantId, jatuhTempo])
  @@index([pelangganId])
}
```

#### 2. Model `DuitkuTransaction` (Sebelumnya Hilang)
```prisma
model DuitkuTransaction {
  id              Int       @id @default(autoincrement())
  merchantOrderId String    @unique
  tenantId        String?
  tenant          Tenant?   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  amount          Decimal   @db.Decimal(12, 2)
  paymentUrl      String?
  qrString        String?
  status          String    @default("PENDING")
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([tenantId, status])
  @@index([merchantOrderId])
}
```

#### 3. Penyesuaian Unik pada `Pelanggan`
```prisma
model Pelanggan {
  id             Int       @id @default(autoincrement())
  nomorPelanggan String    // Diubah dari global unique menjadi unik per tenant
  tenantId       String?
  tenant         Tenant?   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  nama           String
  noTelepon      String
  // ... field lainnya ...

  @@unique([tenantId, nomorPelanggan]) // Nomor pelanggan unik per mitra
  @@index([tenantId, status])
  @@index([noTelepon])
}
```

---

## 3. Skrip Migrasi SQL Dua Tahap (Two-Phase Migration)

### Tahap 1: Eksekusi DDL Non-Locking (Additive)
Eksekusi DDL penambahan kolom dengan sifat `NULL` sehingga PostgreSQL tidak mengunci tabel operasional:

```sql
-- 1. Tambah kolom tenantId pada Tagihan
ALTER TABLE "Tagihan" 
ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

-- 2. Tambah foreign key ke tabel Tenant
ALTER TABLE "Tagihan" 
ADD CONSTRAINT "fk_tagihan_tenant" 
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;

-- 3. Tambah kolom tenantId pada DuitkuTransaction
ALTER TABLE "DuitkuTransaction" 
ADD COLUMN IF NOT EXISTS "tenantId" TEXT;

ALTER TABLE "DuitkuTransaction" 
ADD CONSTRAINT "fk_duitku_tenant" 
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE;

-- 4. Buat indeks gabungan secara CONCURRENTLY (tanpa mengunci operasi read/write)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_tagihan_tenant_status" 
ON "Tagihan" ("tenantId", "status", "periode");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_duitku_tenant_status" 
ON "DuitkuTransaction" ("tenantId", "status");
```

### Tahap 2: Data Backfill Idempoten (Menetapkan Data Lama ke UPS HERU)
Semua data historis WastePay adalah milik UPS HERU. Skrip backfill mengaitkan seluruh record lama ke tenant percontohan (`tenant-pilot-upsheru`):

```sql
BEGIN;

-- Pastikan Tenant Pilot UPS HERU sudah ada
INSERT INTO "Tenant" (
  "id", "slug", "namaMitra", "tipePengelola", "status", "paketLangganan", 
  "customDomain", "subdomain", "createdAt", "updatedAt"
) VALUES (
  'tenant-pilot-upsheru', 'upsheru', 'UPS HERU Kota Depok', 'tps3r', 
  'aktif', 'percontohan', 'upsheru.com', 'upsheru.o2whero.com', NOW(), NOW()
) ON CONFLICT ("id") DO UPDATE SET "slug" = 'upsheru';

-- Backfill Tagihan berdasarkan pelanggan pemiliknya
UPDATE "Tagihan" t
SET "tenantId" = p."tenantId"
FROM "Pelanggan" p
WHERE t."pelangganId" = p."id" 
  AND t."tenantId" IS NULL;

-- Backfill sisa Tagihan yang mungkin belum terhubung ke 'tenant-pilot-upsheru'
UPDATE "Tagihan" 
SET "tenantId" = 'tenant-pilot-upsheru' 
WHERE "tenantId" IS NULL;

-- Backfill DuitkuTransaction
UPDATE "DuitkuTransaction" 
SET "tenantId" = 'tenant-pilot-upsheru' 
WHERE "tenantId" IS NULL;

-- Backfill tabel operasional lainnya yang masih memiliki tenantId NULL
UPDATE "Pelanggan" SET "tenantId" = 'tenant-pilot-upsheru' WHERE "tenantId" IS NULL;
UPDATE "Petugas" SET "tenantId" = 'tenant-pilot-upsheru' WHERE "tenantId" IS NULL;
UPDATE "Kendaraan" SET "tenantId" = 'tenant-pilot-upsheru' WHERE "tenantId" IS NULL;
UPDATE "Pembayaran" SET "tenantId" = 'tenant-pilot-upsheru' WHERE "tenantId" IS NULL;
UPDATE "Pengangkutan" SET "tenantId" = 'tenant-pilot-upsheru' WHERE "tenantId" IS NULL;
UPDATE "Komplain" SET "tenantId" = 'tenant-pilot-upsheru' WHERE "tenantId" IS NULL;
UPDATE "Pengeluaran" SET "tenantId" = 'tenant-pilot-upsheru' WHERE "tenantId" IS NULL;

COMMIT;
```

---

## 4. Konfigurasi PostgreSQL Row-Level Security (RLS)

Untuk proteksi tingkat kernel basis data (Defense-in-Depth), PostgreSQL RLS diaktifkan agar query SQL langsung dicegah membaca data tenant lain bahkan jika aplikasi mengalami bug:

```sql
-- 1. Aktifkan Row-Level Security pada tabel vital
ALTER TABLE "Pelanggan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tagihan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pembayaran" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Pengangkutan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Komplain" ENABLE ROW LEVEL SECURITY;

-- 2. Buat Policy Isolasi Tenant
-- Aplikasi menyetel session variable: SET LOCAL app.current_tenant_id = 'tenant-xxx';
CREATE POLICY tenant_isolation_pelanggan ON "Pelanggan"
FOR ALL
USING (
  "tenantId" = current_setting('app.current_tenant_id', true)
  OR current_setting('app.is_superadmin', true) = 'true'
);

CREATE POLICY tenant_isolation_tagihan ON "Tagihan"
FOR ALL
USING (
  "tenantId" = current_setting('app.current_tenant_id', true)
  OR current_setting('app.is_superadmin', true) = 'true'
);

CREATE POLICY tenant_isolation_pembayaran ON "Pembayaran"
FOR ALL
USING (
  "tenantId" = current_setting('app.current_tenant_id', true)
  OR current_setting('app.is_superadmin', true) = 'true'
);
```

---

## 5. Prosedur Otomasi Provisioning Dedicated Database (Enterprise)

Ketika calon mitra Enterprise (contoh: DLH Kota Bandung) mendaftar dan disetujui:
1. Skrip otomatis memicu pembuatan database baru di server PostgreSQL Dedicated:
   ```bash
   createdb -h db-enterprise.o2whero.com -U postgres o2w_tenant_dlh_bandung
   ```
2. Menjalankan migrasi skema terisolasi:
   ```bash
   DATABASE_URL="postgresql://postgres:pass@db-enterprise.o2whero.com:5432/o2w_tenant_dlh_bandung" npx prisma db push
   ```
3. Mengisi `Tenant.dbConnectionString` dengan kredensial terenkripsi di `Tenant` registry control plane.
4. `TenantDatabaseManager` otomatis membuat connection pool khusus saat request pertama masuk ke domain `dlh.bandung.go.id`.
