-- AlterTable
ALTER TABLE "public"."Article" ADD COLUMN     "htmlContent" TEXT,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processingStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "summary" TEXT;

-- CreateIndex
CREATE INDEX "Article_processingStatus_idx" ON "public"."Article"("processingStatus");

-- CreateIndex
CREATE INDEX "Article_processedAt_idx" ON "public"."Article"("processedAt");
