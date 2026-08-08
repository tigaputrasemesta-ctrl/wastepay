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
    "fotoRumah" TEXT,
    "patokanLokasi" TEXT,
    "penanggungjawab" TEXT,
    "referal" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "catatan" TEXT,
    "wilayahId" INTEGER NOT NULL,
    "paketId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pelanggan_wilayahId_fkey" FOREIGN KEY ("wilayahId") REFERENCES "Wilayah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pelanggan_paketId_fkey" FOREIGN KEY ("paketId") REFERENCES "Paket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pelanggan" ("alamat", "catatan", "createdAt", "fotoRumah", "id", "nama", "noTelepon", "paketId", "patokanLokasi", "rtRw", "status", "updatedAt", "wilayahId") SELECT "alamat", "catatan", "createdAt", "fotoRumah", "id", "nama", "noTelepon", "paketId", "patokanLokasi", "rtRw", "status", "updatedAt", "wilayahId" FROM "Pelanggan";
DROP TABLE "Pelanggan";
ALTER TABLE "new_Pelanggan" RENAME TO "Pelanggan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
