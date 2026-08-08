-- AlterTable
ALTER TABLE "Tagihan" ADD COLUMN "noInvoice" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Tagihan_noInvoice_key" ON "Tagihan"("noInvoice");
