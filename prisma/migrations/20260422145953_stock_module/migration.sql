-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "costsExclVatCents" INTEGER DEFAULT 0;
ALTER TABLE "Vehicle" ADD COLUMN "netProfitCents" INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN "purchaseDate" DATETIME;
ALTER TABLE "Vehicle" ADD COLUMN "purchasePriceExclVatCents" INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN "purchaseVatType" TEXT;
ALTER TABLE "Vehicle" ADD COLUMN "salePriceExclVatCents" INTEGER;
ALTER TABLE "Vehicle" ADD COLUMN "saleVatType" TEXT;
