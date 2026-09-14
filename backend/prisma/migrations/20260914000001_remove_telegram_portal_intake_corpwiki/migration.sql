-- Remove Telegram integration, Client Portal, Intake Forms and Corporate Wiki
-- Product scope reduction: these modules were orthogonal to core PM functionality

-- Drop dependent tables first (FKs)
DROP TABLE IF EXISTS "intake_submissions";
DROP TABLE IF EXISTS "intake_forms";
DROP TABLE IF EXISTS "client_portals";
DROP TABLE IF EXISTS "corporate_wiki_revisions";
DROP TABLE IF EXISTS "corporate_wiki_pages";

-- Drop now-unused enums
DROP TYPE IF EXISTS "IntakeSubmissionStatus";
DROP TYPE IF EXISTS "IntakeFormStatus";

-- Remove telegram chat id from users
ALTER TABLE "users" DROP COLUMN IF EXISTS "telegramChatId";

-- Remove SEND_TELEGRAM from AutomationActionType enum
-- actions column is Json, not typed — safe to recreate enum directly
BEGIN;
ALTER TYPE "AutomationActionType" RENAME TO "AutomationActionType_old";
CREATE TYPE "AutomationActionType" AS ENUM ('CHANGE_STATUS', 'ASSIGN_USER', 'SEND_NOTIFICATION', 'CREATE_TASK', 'SEND_EMAIL');
DROP TYPE "AutomationActionType_old";
COMMIT;
