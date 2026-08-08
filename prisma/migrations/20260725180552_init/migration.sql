-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Wilayah" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "rt" TEXT,
    "rw" TEXT,
    "kelurahan" TEXT,
    "kecamatan" TEXT,
    "kota" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Pelanggan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "noTelepon" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "rtRw" TEXT,
    "fotoRumah" TEXT,
    "patokanLokasi" TEXT,
    "status" TEXT NOT NULL DEFAULT 'aktif',
    "catatan" TEXT,
    "wilayahId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pelanggan_wilayahId_fkey" FOREIGN KEY ("wilayahId") REFERENCES "Wilayah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Petugas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "noTelepon" TEXT NOT NULL,
    "foto" TEXT,
    "email" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "wilayahId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Petugas_wilayahId_fkey" FOREIGN KEY ("wilayahId") REFERENCES "Wilayah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Rute" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nama" TEXT NOT NULL,
    "hari" TEXT NOT NULL,
    "jam" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "wilayahId" INTEGER NOT NULL,
    "petugasId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Rute_wilayahId_fkey" FOREIGN KEY ("wilayahId") REFERENCES "Wilayah" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Rute_petugasId_fkey" FOREIGN KEY ("petugasId") REFERENCES "Petugas" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Jadwal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hari" TEXT NOT NULL,
    "jam" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "pelangganId" INTEGER NOT NULL,
    "ruteId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Jadwal_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES "Pelanggan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Jadwal_ruteId_fkey" FOREIGN KEY ("ruteId") REFERENCES "Rute" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Tagihan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bulan" INTEGER NOT NULL,
    "tahun" INTEGER NOT NULL,
    "jumlah" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'belum_bayar',
    "jatuhTempo" DATETIME NOT NULL,
    "tanggalLunas" DATETIME,
    "keterangan" TEXT,
    "pelangganId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Tagihan_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES "Pelanggan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pembayaran" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jumlah" REAL NOT NULL,
    "metode" TEXT NOT NULL,
    "buktiBayar" TEXT,
    "status" TEXT NOT NULL DEFAULT 'terverifikasi',
    "catatan" TEXT,
    "tagihanId" INTEGER NOT NULL,
    "pelangganId" INTEGER NOT NULL,
    "verifiedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pembayaran_tagihanId_fkey" FOREIGN KEY ("tagihanId") REFERENCES "Tagihan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pembayaran_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES "Pelanggan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pembayaran_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pengangkutan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'terjadwal',
    "catatan" TEXT,
    "fotoBukti" TEXT,
    "pelangganId" INTEGER NOT NULL,
    "petugasId" INTEGER,
    "jadwalId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pengangkutan_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES "Pelanggan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Pengangkutan_petugasId_fkey" FOREIGN KEY ("petugasId") REFERENCES "Petugas" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pengangkutan_jadwalId_fkey" FOREIGN KEY ("jadwalId") REFERENCES "Jadwal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Komplain" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jenis" TEXT NOT NULL DEFAULT 'tidak_diangkut',
    "deskripsi" TEXT NOT NULL,
    "foto" TEXT,
    "status" TEXT NOT NULL DEFAULT 'baru',
    "tanggapan" TEXT,
    "pelangganId" INTEGER NOT NULL,
    "resolvedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Komplain_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES "Pelanggan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Komplain_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LiburSementara" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tanggalMulai" DATETIME NOT NULL,
    "tanggalSelesai" DATETIME NOT NULL,
    "alasan" TEXT NOT NULL,
    "pelangganId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LiburSementara_pelangganId_fkey" FOREIGN KEY ("pelangganId") REFERENCES "Pelanggan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pengumuman" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "penting" BOOLEAN NOT NULL DEFAULT false,
    "untukWilayahId" INTEGER,
    "createdById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pengumuman_untukWilayahId_fkey" FOREIGN KEY ("untukWilayahId") REFERENCES "Wilayah" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Pengumuman_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pengeluaran" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tanggal" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kategori" TEXT NOT NULL,
    "jumlah" REAL NOT NULL,
    "keterangan" TEXT NOT NULL,
    "bukti" TEXT,
    "dicatatById" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pengeluaran_dicatatById_fkey" FOREIGN KEY ("dicatatById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pengaturan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Jadwal_pelangganId_ruteId_hari_key" ON "Jadwal"("pelangganId", "ruteId", "hari");

-- CreateIndex
CREATE UNIQUE INDEX "Tagihan_pelangganId_bulan_tahun_key" ON "Tagihan"("pelangganId", "bulan", "tahun");

-- CreateIndex
CREATE UNIQUE INDEX "Pengaturan_key_key" ON "Pengaturan"("key");
