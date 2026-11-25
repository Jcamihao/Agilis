-- F1 (v3.11.0): remove Automações. Body gerado por `prisma migrate diff`; DELETEs abaixo
-- vêm antes porque o cast de enum falha se existir notificação ou execução legada.
DELETE FROM "automation_executions";
DELETE FROM "automation_rules";
DELETE FROM "notifications" WHERE "type"::text = 'AUTOMATION_TRIGGERED';

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('TASK_ASSIGNED', 'TASK_COMMENTED', 'TASK_MENTIONED', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'TASK_STATUS_CHANGED', 'PROJECT_INVITE', 'INSIGHT_GENERATED');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "automation_rules" DROP CONSTRAINT "automation_rules_companyId_fkey";

-- DropForeignKey
ALTER TABLE "automation_rules" DROP CONSTRAINT "automation_rules_projectId_fkey";

-- DropForeignKey
ALTER TABLE "automation_executions" DROP CONSTRAINT "automation_executions_ruleId_fkey";

-- DropForeignKey
ALTER TABLE "automation_executions" DROP CONSTRAINT "automation_executions_taskId_fkey";

-- DropTable
DROP TABLE "automation_rules";

-- DropTable
DROP TABLE "automation_executions";

-- DropEnum
DROP TYPE "AutomationTrigger";

-- DropEnum
DROP TYPE "AutomationActionType";

-- DropEnum
DROP TYPE "ExecutionStatus";

