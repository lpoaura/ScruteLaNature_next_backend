/*
  Warnings:

  - You are about to drop the column `agenceId` on the `parcours` table. All the data in the column will be lost.
  - You are about to drop the column `agenceId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `agences` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `organismeId` to the `parcours` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "parcours" DROP CONSTRAINT "parcours_agenceId_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_agenceId_fkey";

-- DropIndex
DROP INDEX "parcours_agenceId_idx";

-- DropIndex
DROP INDEX "users_agenceId_idx";

-- AlterTable
ALTER TABLE "parcours" DROP COLUMN "agenceId",
ADD COLUMN     "organismeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "agenceId",
ADD COLUMN     "organismeId" TEXT;

-- DropTable
DROP TABLE "agences";

-- CreateTable
CREATE TABLE "organismes" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organismes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organismes_nom_key" ON "organismes"("nom");

-- CreateIndex
CREATE INDEX "parcours_organismeId_idx" ON "parcours"("organismeId");

-- CreateIndex
CREATE INDEX "users_organismeId_idx" ON "users"("organismeId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organismeId_fkey" FOREIGN KEY ("organismeId") REFERENCES "organismes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcours" ADD CONSTRAINT "parcours_organismeId_fkey" FOREIGN KEY ("organismeId") REFERENCES "organismes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
