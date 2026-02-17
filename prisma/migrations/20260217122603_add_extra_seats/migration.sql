-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "extraSeats" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stripeExtraSeatItemId" TEXT;
