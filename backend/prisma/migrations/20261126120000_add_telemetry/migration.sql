-- F11 (v3.16.0): telemetria do fundador — product_events + error_logs. Gerada por `prisma migrate diff`.
-- CreateEnum
CREATE TYPE "ErrorLogSource" AS ENUM ('SERVER', 'CLIENT');

-- CreateTable
CREATE TABLE "product_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "event" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "source" "ErrorLogSource" NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "method" TEXT,
    "path" TEXT,
    "userAgent" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_events_companyId_event_createdAt_idx" ON "product_events"("companyId", "event", "createdAt");

-- CreateIndex
CREATE INDEX "product_events_createdAt_idx" ON "product_events"("createdAt");

-- CreateIndex
CREATE INDEX "error_logs_source_createdAt_idx" ON "error_logs"("source", "createdAt");

