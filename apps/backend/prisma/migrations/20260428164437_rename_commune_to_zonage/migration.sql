/*
  Warnings:

  - You are about to drop the column `communeId` on the `parcours` table. All the data in the column will be lost.
  - You are about to drop the `communes` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `zonageId` to the `parcours` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "parcours" DROP CONSTRAINT "parcours_communeId_fkey";

-- DropIndex
DROP INDEX "parcours_communeId_idx";

-- AlterTable
ALTER TABLE "parcours" DROP COLUMN "communeId",
ADD COLUMN     "zonageId" TEXT NOT NULL;

-- DropTable
DROP TABLE "communes";

-- CreateTable
CREATE TABLE "zonages" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "codePostal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zonages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "zonages_nom_key" ON "zonages"("nom");

-- CreateIndex
CREATE INDEX "parcours_zonageId_idx" ON "parcours"("zonageId");

-- AddForeignKey
ALTER TABLE "parcours" ADD CONSTRAINT "parcours_zonageId_fkey" FOREIGN KEY ("zonageId") REFERENCES "zonages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
