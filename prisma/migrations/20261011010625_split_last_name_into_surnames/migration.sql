/*
  Warnings:

  - You are about to drop the column `lastName` on the `User` table. All the data in the column will be lost.
  - Added the required column `firstSurname` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastName",
ADD COLUMN     "firstSurname" TEXT NOT NULL,
ADD COLUMN     "secondSurname" TEXT;
