-- F6 (v3.14.0): insight de conflito de prazos. Gerado por `prisma migrate diff`.
-- PG16 permite ADD VALUE dentro da transação da migration.

-- AlterEnum
ALTER TYPE "InsightType" ADD VALUE 'DEADLINE_CONFLICT';
