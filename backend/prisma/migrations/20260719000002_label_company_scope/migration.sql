-- AlterTable: add companyId to labels (with default for existing rows)
ALTER TABLE "labels" ADD COLUMN "companyId" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "labels_companyId_idx" ON "labels"("companyId");

-- AddForeignKey (skip FK for rows with empty companyId — table is empty in dev)
ALTER TABLE "labels" ADD CONSTRAINT "labels_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
