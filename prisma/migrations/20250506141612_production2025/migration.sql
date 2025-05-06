/*
  Warnings:

  - You are about to drop the column `assignIfStatusOfferApproved` on the `TaskGroup` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TaskDefinition" ADD COLUMN     "statusOfferApproved" BOOLEAN,
ADD COLUMN     "statusOfferLetterCreated" BOOLEAN,
ADD COLUMN     "statusOfferWillNotBeMade" BOOLEAN;

-- AlterTable
ALTER TABLE "TaskGroup" DROP COLUMN "assignIfStatusOfferApproved",
ADD COLUMN     "assignIfOfferApproved" BOOLEAN,
ADD COLUMN     "assignIfOfferWillNotBeMade" BOOLEAN;
