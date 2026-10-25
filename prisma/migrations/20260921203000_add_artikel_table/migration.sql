-- CreateTable
CREATE TABLE "Artikel" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "isi" TEXT NOT NULL,
    "kategori" TEXT NOT NULL DEFAULT 'edukasi',
    "gambar" TEXT,
    "diterbitkan" BOOLEAN NOT NULL DEFAULT false,
    "penulisId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artikel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Artikel_slug_key" ON "Artikel"("slug");

-- CreateIndex
CREATE INDEX "Artikel_slug_idx" ON "Artikel"("slug");

-- CreateIndex
CREATE INDEX "Artikel_diterbitkan_createdAt_idx" ON "Artikel"("diterbitkan", "createdAt");

-- AddForeignKey
ALTER TABLE "Artikel" ADD CONSTRAINT "Artikel_penulisId_fkey" FOREIGN KEY ("penulisId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
