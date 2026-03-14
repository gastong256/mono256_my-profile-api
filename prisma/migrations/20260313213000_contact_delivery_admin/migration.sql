-- CreateEnum
CREATE TYPE "ContactSubmissionReviewStatus" AS ENUM ('NEW', 'IN_REVIEW', 'RESOLVED', 'SPAM');

-- CreateEnum
CREATE TYPE "ContactDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- AlterTable
ALTER TABLE "ContactSubmission"
ADD COLUMN "reviewStatus" "ContactSubmissionReviewStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN "deliveryStatus" "ContactDeliveryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "deliveryAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastDeliveryAttemptAt" TIMESTAMP(3),
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "lastDeliveryError" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "ContactSubmission_reviewStatus_createdAt_idx"
ON "ContactSubmission"("reviewStatus", "createdAt");

-- CreateIndex
CREATE INDEX "ContactSubmission_deliveryStatus_createdAt_idx"
ON "ContactSubmission"("deliveryStatus", "createdAt");
