/*
  Warnings:

  - You are about to drop the column `stock` on the `Product` table. All the data in the column will be lost.
  - Added the required column `seller` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellerPhone` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "stock",
ADD COLUMN     "seller" TEXT NOT NULL,
ADD COLUMN     "sellerPhone" TEXT NOT NULL;
