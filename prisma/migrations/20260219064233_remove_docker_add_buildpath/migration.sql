/*
  Warnings:

  - You are about to drop the column `containerId` on the `Deployment` table. All the data in the column will be lost.
  - You are about to drop the column `port` on the `Deployment` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Deployment" DROP COLUMN "containerId",
DROP COLUMN "port",
ADD COLUMN     "buildPath" TEXT;
