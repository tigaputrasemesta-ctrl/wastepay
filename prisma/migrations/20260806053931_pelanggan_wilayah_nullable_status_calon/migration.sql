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
    "koordinatSumber" TEXT,
    "koordinatAkurasi" REAL,
    "penanggungjawab" TEXT,
    "referal" TEXT,
    "customTarif" REAL,
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "catatan" TEXT,
    "wilayahId" INTEGER,
    "paketId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Pelanggan_wilayahId_fkey" FOREIGN KEY ("wilayahId") REFERENCES "Wilayah" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pelanggan_paketId_fkey" FOREIGN KEY ("paketId") REFERENCES "Paket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pelanggan" ("alamat", "catatan", "createdAt", "customTarif", "deletedAt", "fotoRumah", "id", "kategori", "kodePelanggan", "koordinatAkurasi", "koordinatSumber", "latitude", "longitude", "nama", "noTelepon", "paketId", "patokanLokasi", "penanggungjawab", "referal", "rtRw", "status", "updatedAt", "wilayahId") SELECT "alamat", "catatan", "createdAt", "customTarif", "deletedAt", "fotoRumah", "id", "kategori", "kodePelanggan", "koordinatAkurasi", "koordinatSumber", "latitude", "longitude", "nama", "noTelepon", "paketId", "patokanLokasi", "penanggungjawab", "referal", "rtRw", "status", "updatedAt", "wilayahId" FROM "Pelanggan";
DROP TABLE "Pelanggan";
ALTER TABLE "new_Pelanggan" RENAME TO "Pelanggan";
CREATE UNIQUE INDEX "Pelanggan_kodePelanggan_key" ON "Pelanggan"("kodePelanggan");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
