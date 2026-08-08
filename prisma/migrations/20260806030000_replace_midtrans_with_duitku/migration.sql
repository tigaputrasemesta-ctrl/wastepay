-- CreateTable
CREATE TABLE "DuitkuTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" TEXT NOT NULL,
    "pembayaranId" INTEGER NOT NULL,
    "paymentUrl" TEXT,
    "reference" TEXT,
    "paymentMethod" TEXT,
    "statusCode" TEXT,
    "statusMessage" TEXT,
    "amount" REAL,
    "rawResponse" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DuitkuTransaction_pembayaranId_fkey" FOREIGN KEY ("pembayaranId") REFERENCES "Pembayaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DuitkuTransaction_orderId_key" ON "DuitkuTransaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "DuitkuTransaction_pembayaranId_key" ON "DuitkuTransaction"("pembayaranId");

-- CreateIndex
CREATE INDEX "DuitkuTransaction_pembayaranId_idx" ON "DuitkuTransaction"("pembayaranId");

-- DropTable (Midtrans diganti Duitku)
DROP TABLE "MidtransTransaction";
