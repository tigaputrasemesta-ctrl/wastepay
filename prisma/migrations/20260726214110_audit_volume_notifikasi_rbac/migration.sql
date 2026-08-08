-- AlterTable
ALTER TABLE "Pelanggan" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Petugas" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Tagihan" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "Tagihan" ADD COLUMN "denda" REAL;

-- CreateTable
CREATE TABLE "Tpa" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "alamat" TEXT,
    "kota" TEXT,
    "jarak" REAL,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitasId" INTEGER NOT NULL,
    "dataLama" TEXT,
    "dataBaru" TEXT,
    "userId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notifikasi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipe" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "penerima" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "pelangganId" INTEGER,
    "dikirimPada" DATETIME,
    "error" TEXT,
    "createdById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notifikasi_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES "Pelanggan" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Notifikasi_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rekonsiliasi" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalPemasukan" REAL NOT NULL DEFAULT 0,
    "totalPengeluaran" REAL NOT NULL DEFAULT 0,
    "totalTunaiSistem" REAL NOT NULL DEFAULT 0,
    "totalTunaiFisik" REAL,
    "selisih" REAL,
    "catatan" TEXT,
    "userId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Rekonsiliasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pengangkutan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'terjadwal',
    "volume" REAL,
    "berat" REAL,
    "jenisSampah" TEXT,
    "catatan" TEXT,
    "fotoBukti" TEXT,
    "pelangganId" INTEGER NOT NULL,
    "petugasId" INTEGER,
    "jadwalId" INTEGER,
    "tpaId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pengangkutan_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES "Pelanggan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pengangkutan_petugasId_fkey" FOREIGN KEY ("petugasId") REFERENCES "Petugas" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pengangkutan_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES "Jadwal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pengangkutan_tpaId_fkey" FOREIGN KEY ("tpaId") REFERENCES "Tpa" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Pengangkutan" ("catatan", "createdAt", "fotoBukti", "id", "jadwalId", "pelangganId", "petugasId", "status", "tanggal", "updatedAt") SELECT "catatan", "createdAt", "fotoBukti", "id", "jadwalId", "pelangganId", "petugasId", "status", "tanggal", "updatedAt" FROM "Pengangkutan";
DROP TABLE "Pengangkutan";
ALTER TABLE "new_Pengangkutan" RENAME TO "Pengangkutan";
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "noTelepon" TEXT,
    "foto" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "id", "nama", "password", "role", "updatedAt") SELECT "createdAt", "email", "id", "nama", "password", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
