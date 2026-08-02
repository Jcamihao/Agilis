-- Remove SEND_WHATSAPP from AutomationActionType enum
-- actions column is Json, not typed — safe to recreate enum directly
BEGIN;
ALTER TYPE "AutomationActionType" RENAME TO "AutomationActionType_old";
CREATE TYPE "AutomationActionType" AS ENUM ('CHANGE_STATUS', 'ASSIGN_USER', 'SEND_NOTIFICATION', 'CREATE_TASK', 'SEND_EMAIL', 'SEND_TELEGRAM');
DROP TYPE "AutomationActionType_old";
COMMIT;
