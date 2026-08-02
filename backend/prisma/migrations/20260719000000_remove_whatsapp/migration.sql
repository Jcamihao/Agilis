-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('TASK_ASSIGNED', 'TASK_COMMENTED', 'TASK_MENTIONED', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'TASK_STATUS_CHANGED', 'PROJECT_INVITE', 'AUTOMATION_TRIGGERED', 'INSIGHT_GENERATED');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "whatsapp_configs" DROP CONSTRAINT "whatsapp_configs_companyId_fkey";

-- DropForeignKey
ALTER TABLE "whatsapp_messages" DROP CONSTRAINT "whatsapp_messages_configId_fkey";

-- DropTable
DROP TABLE "whatsapp_configs";

-- DropTable
DROP TABLE "whatsapp_messages";

-- DropEnum
DROP TYPE "WhatsAppStatus";

