/*
  Warnings:

  - A unique constraint covering the columns `[creative_id]` on the table `ad_creatives` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ad_creatives" ADD COLUMN     "creative_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ad_creatives_creative_id_key" ON "ad_creatives"("creative_id");
