-- Remove Wiki de Projetos, Centro de Processos and Webhooks
-- Product scope reduction: out of scope for a project/task manager
-- (document editor, BPM/checklist flows and outbound integrations).

-- Wiki
DROP TABLE IF EXISTS "wiki_page_revisions";
DROP TABLE IF EXISTS "wiki_pages";

-- Process Center (children first)
DROP TABLE IF EXISTS "checklist_item_answers";
DROP TABLE IF EXISTS "process_instance_steps";
DROP TABLE IF EXISTS "process_instances";
DROP TABLE IF EXISTS "checklist_items";
DROP TABLE IF EXISTS "process_steps";
DROP TABLE IF EXISTS "processes";
DROP TYPE IF EXISTS "ProcessStepType";
DROP TYPE IF EXISTS "ProcessStatus";

-- Webhooks
DROP TABLE IF EXISTS "webhook_deliveries";
DROP TABLE IF EXISTS "webhooks";
