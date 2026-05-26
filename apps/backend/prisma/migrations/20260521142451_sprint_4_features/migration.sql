/*
  Warnings:

  - You are about to drop the column `codePostal` on the `zonages` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "JeuType" ADD VALUE 'PUZZLE';

-- AlterEnum
ALTER TYPE "PublishStatus" ADD VALUE 'PENDING_REVIEW';

-- AlterTable
ALTER TABLE "parcours" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "zonages" DROP COLUMN "codePostal",
ADD COLUMN     "code" TEXT;

-- CreateTable
CREATE TABLE "parcours_downloads" (
    "id" TEXT NOT NULL,
    "parcoursId" TEXT NOT NULL,
    "userId" TEXT,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parcours_downloads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parcours_downloads_parcoursId_idx" ON "parcours_downloads"("parcoursId");

-- CreateIndex
CREATE INDEX "parcours_downloads_downloadedAt_idx" ON "parcours_downloads"("downloadedAt");

-- AddForeignKey
ALTER TABLE "parcours" ADD CONSTRAINT "parcours_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcours_downloads" ADD CONSTRAINT "parcours_downloads_parcoursId_fkey" FOREIGN KEY ("parcoursId") REFERENCES "parcours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcours_downloads" ADD CONSTRAINT "parcours_downloads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
