-- F4 (v3.12.1): medição de custo de IA. Gerado por `prisma migrate diff`.

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "requestChars" INTEGER NOT NULL,
    "responseChars" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_logs_companyId_createdAt_idx" ON "ai_usage_logs"("companyId", "createdAt");
