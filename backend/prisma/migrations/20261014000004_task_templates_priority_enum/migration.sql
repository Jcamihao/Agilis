-- Align task_templates with schema.prisma: the hand-written migration
-- 20260721000001 created priority as TEXT, but the model declares the
-- Priority enum. Unknown legacy values fall back to MEDIUM so the cast
-- can never fail on old data.
ALTER TABLE "task_templates" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "task_templates"
  ALTER COLUMN "priority" TYPE "Priority"
  USING (CASE WHEN "priority" IN ('LOW','MEDIUM','HIGH','CRITICAL') THEN "priority" ELSE 'MEDIUM' END)::"Priority";
ALTER TABLE "task_templates" ALTER COLUMN "priority" SET DEFAULT 'MEDIUM';

-- @updatedAt is set by Prisma, the column needs no database default
ALTER TABLE "task_templates" ALTER COLUMN "updated_at" DROP DEFAULT;
