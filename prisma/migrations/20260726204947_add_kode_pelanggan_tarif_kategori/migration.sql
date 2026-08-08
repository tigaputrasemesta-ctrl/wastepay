/*
  Warnings:

  - Added the required column `kodePelanggan` to the `Pelanggan` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "KategoriTarif" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "kategori" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "tarif" REAL NOT NULL,
    "deskripsi" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pelanggan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "noTelepon" TEXT NOT NULL,
    "kategori" TEXT NOT NULL DEFAULT 'rumah_tangga',
    "alamat" TEXT NOT NULL,
    "rtRw" TEXT,
    "kodePelanggan" TEXT NOT NULL,
    "fotoRumah" TEXT,
    "patokanLokasi" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "penanggungjawab" TEXT,
    "referal" TEXT,
    "customTarif" REAL,
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "catatan" TEXT,
    "wilayahId" INTEGER NOT NULL,
    "paketId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pelanggan_wilayahId_fkey" FOREIGN KEY ("wilayahId") REFERENCES "Wilayah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pelanggan_paketId_fkey" FOREIGN KEY ("paketId") REFERENCES "Paket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pelanggan" ("alamat", "catatan", "createdAt", "fotoRumah", "id", "kategori", "latitude", "longitude", "nama", "noTelepon", "paketId", "patokanLokasi", "penanggungjawab", "referal", "rtRw", "status", "updatedAt", "wilayahId", "kodePelanggan") SELECT "alamat", "catatan", "createdAt", "fotoRumah", "id", "kategori", "latitude", "longitude", "nama", "noTelepon", "paketId", "patokanLokasi", "penanggungjawab", "referal", "rtRw", "status", "updatedAt", "wilayahId", printf('P-%06d', "id") FROM "Pelanggan";
DROP TABLE "Pelanggan";
ALTER TABLE "new_Pelanggan" RENAME TO "Pelanggan";
CREATE UNIQUE INDEX "Pelanggan_kodePelanggan_key" ON "Pelanggan"("kodePelanggan");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "KategoriTarif_kategori_key" ON "KategoriTarif"("kategori");

-- Seed KategoriTarif defaults
INSERT OR IGNORE INTO "KategoriTarif" ("kategori", "label", "tarif", "deskripsi", "createdAt", "updatedAt") VALUES
  ('rumah_tangga', 'Rumah Tangga', 30000.0, 'Iuran sampah rumah tangga reguler', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('bisnis', 'Bisnis / Toko', 75000.0, 'Toko, warung, usaha kecil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('kost', 'Kost / Kontrakan', 50000.0, 'Kost dan kontrakan', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('sekolah', 'Sekolah', 100000.0, 'Sekolah dan lembaga pendidikan', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('rm_makan', 'Rumah Makan', 100000.0, 'Rumah makan, warteg, katering', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('perkantoran', 'Perkantoran', 75000.0, 'Kantor dan perkantoran', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('industri', 'Industri', 150000.0, 'Industri dan pabrik kecil', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('lainnya', 'Lainnya', 30000.0, 'Kategori lainnya', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
