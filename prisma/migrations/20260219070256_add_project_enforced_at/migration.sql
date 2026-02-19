-- AlterEnum
ALTER TYPE "Currency" ADD VALUE 'CRYPTO';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentProvider" ADD VALUE 'PESAPAL';
ALTER TYPE "PaymentProvider" ADD VALUE 'NOWPAYMENTS';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "providerMetadata" JSONB;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "enforcedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "nowpaymentsInvoiceId" TEXT,
ADD COLUMN     "pesapalOrderTrackingId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "verificationAttempts" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Subscription_pesapalOrderTrackingId_idx" ON "Subscription"("pesapalOrderTrackingId");

-- CreateIndex
CREATE INDEX "Subscription_nowpaymentsInvoiceId_idx" ON "Subscription"("nowpaymentsInvoiceId");
