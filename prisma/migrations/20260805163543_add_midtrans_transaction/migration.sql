-- CreateTable
CREATE TABLE "MidtransTransaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" TEXT NOT NULL,
    "pembayaranId" INTEGER NOT NULL,
    "snapToken" TEXT,
    "redirectUrl" TEXT,
    "transactionId" TEXT,
    "transactionStatus" TEXT,
    "paymentType" TEXT,
    "fraudStatus" TEXT,
    "grossAmount" REAL,
    "rawResponse" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MidtransTransaction_pembayaranId_fkey" FOREIGN KEY ("pembayaranId") REFERENCES "Pembayaran" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MidtransTransaction_orderId_key" ON "MidtransTransaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "MidtransTransaction_pembayaranId_key" ON "MidtransTransaction"("pembayaranId");

-- CreateIndex
CREATE INDEX "MidtransTransaction_pembayaranId_idx" ON "MidtransTransaction"("pembayaranId");
