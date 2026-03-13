-- AlterTable
ALTER TABLE "ContactSubmission"
ADD COLUMN "fingerprint" TEXT NOT NULL DEFAULT '',
ADD COLUMN "ipHash" TEXT,
ADD COLUMN "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "ContactSubmission_email_createdAt_idx"
ON "ContactSubmission"("email", "createdAt");

-- CreateIndex
CREATE INDEX "ContactSubmission_ipHash_createdAt_idx"
ON "ContactSubmission"("ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "ContactSubmission_fingerprint_createdAt_idx"
ON "ContactSubmission"("fingerprint", "createdAt");
