-- DropIndex
DROP INDEX "DuitkuTransaction_pembayaranId_idx";

-- CreateIndex
CREATE INDEX "Jadwal_pelangganId_idx" ON "Jadwal"("pelangganId");

-- CreateIndex
CREATE INDEX "Jadwal_ruteId_idx" ON "Jadwal"("ruteId");

-- CreateIndex
CREATE INDEX "Komplain_status_idx" ON "Komplain"("status");

-- CreateIndex
CREATE INDEX "Komplain_pelangganId_idx" ON "Komplain"("pelangganId");

-- CreateIndex
CREATE INDEX "Pembayaran_tagihanId_idx" ON "Pembayaran"("tagihanId");

-- CreateIndex
CREATE INDEX "Pembayaran_pelangganId_idx" ON "Pembayaran"("pelangganId");

-- CreateIndex
CREATE INDEX "Pembayaran_status_createdAt_idx" ON "Pembayaran"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Pengangkutan_tanggal_status_idx" ON "Pengangkutan"("tanggal", "status");

-- CreateIndex
CREATE INDEX "Pengangkutan_pelangganId_idx" ON "Pengangkutan"("pelangganId");

-- CreateIndex
CREATE INDEX "Pengangkutan_petugasId_idx" ON "Pengangkutan"("petugasId");

-- CreateIndex
CREATE INDEX "Petugas_wilayahId_idx" ON "Petugas"("wilayahId");

-- CreateIndex
CREATE INDEX "Petugas_aktif_idx" ON "Petugas"("aktif");

-- CreateIndex
CREATE INDEX "Tagihan_bulan_tahun_status_idx" ON "Tagihan"("bulan", "tahun", "status");

-- CreateIndex
CREATE INDEX "Tagihan_status_idx" ON "Tagihan"("status");
