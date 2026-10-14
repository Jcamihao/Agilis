-- Remove write-only features and never-used columns (ponytail audit)
-- - Labels: could be created in project settings, but no screen attached a
--   label to a task nor rendered one
-- - Custom task statuses (TaskStatusConfig): could be created, but no task
--   field references them; Kanban columns come from the TaskStatus enum
-- - Columns never written nor read: ai_conversations.model (OpenAI-era
--   default), ai_messages.tokensUsed, audit_logs.userAgent

DROP TABLE IF EXISTS "task_labels";
DROP TABLE IF EXISTS "labels";
DROP TABLE IF EXISTS "task_status_configs";

ALTER TABLE "ai_conversations" DROP COLUMN IF EXISTS "model";
ALTER TABLE "ai_messages" DROP COLUMN IF EXISTS "tokensUsed";
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "userAgent";
