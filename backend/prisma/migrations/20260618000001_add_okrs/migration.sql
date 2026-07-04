-- CreateEnum
CREATE TYPE "ObjectiveStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "KeyResultType"   AS ENUM ('PERCENTAGE', 'NUMBER', 'CURRENCY', 'BOOLEAN');

-- CreateTable objectives
CREATE TABLE "objectives" (
    "id"          TEXT NOT NULL,
    "companyId"   TEXT NOT NULL,
    "ownerId"     TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "status"      "ObjectiveStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate"   TIMESTAMP(3) NOT NULL,
    "endDate"     TIMESTAMP(3) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable key_results
CREATE TABLE "key_results" (
    "id"           TEXT NOT NULL,
    "objectiveId"  TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "type"         "KeyResultType" NOT NULL DEFAULT 'PERCENTAGE',
    "startValue"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetValue"  DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit"         TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    CONSTRAINT "key_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable key_result_tasks
CREATE TABLE "key_result_tasks" (
    "id"          TEXT NOT NULL,
    "keyResultId" TEXT NOT NULL,
    "taskId"      TEXT NOT NULL,
    CONSTRAINT "key_result_tasks_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "objectives_companyId_status_idx" ON "objectives"("companyId", "status");
CREATE INDEX "key_results_objectiveId_idx"     ON "key_results"("objectiveId");
CREATE UNIQUE INDEX "key_result_tasks_keyResultId_taskId_key"
    ON "key_result_tasks"("keyResultId", "taskId");

-- Foreign Keys
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "key_results" ADD CONSTRAINT "key_results_objectiveId_fkey"
    FOREIGN KEY ("objectiveId") REFERENCES "objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "key_result_tasks" ADD CONSTRAINT "key_result_tasks_keyResultId_fkey"
    FOREIGN KEY ("keyResultId") REFERENCES "key_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "key_result_tasks" ADD CONSTRAINT "key_result_tasks_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
