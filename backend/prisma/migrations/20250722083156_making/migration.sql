/*
  Warnings:

  - Added the required column `name` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seller` to the `CartItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellerPhone` to the `CartItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "image" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "seller" TEXT NOT NULL,
ADD COLUMN     "sellerPhone" TEXT NOT NULL;
