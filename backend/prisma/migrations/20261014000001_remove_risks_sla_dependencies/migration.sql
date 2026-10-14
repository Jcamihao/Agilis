-- Remove Risk Management, SLA and Task Dependencies (Gantt)
-- Product scope reduction:
-- - Risks: PMO-style impact x probability matrix, out of scope for this product
-- - SLA: SlaRecord.isBreached was only ever set true for tasks already past
--   their dueDate (see automation.cron.ts), duplicating the existing overdue
--   signal under a different name with no real policy/target behind it
-- - Task dependencies: backing data model for the Gantt chart; no UI ever
--   called the create-dependency endpoint, so this was effectively dead data

-- Risks
DROP TABLE IF EXISTS "risks";
DROP TYPE IF EXISTS "RiskImpact";
DROP TYPE IF EXISTS "RiskProbability";
DROP TYPE IF EXISTS "RiskStatus";
DROP TYPE IF EXISTS "RiskCategory";

-- SLA
DROP TABLE IF EXISTS "sla_records";

-- Task Dependencies (Gantt)
DROP TABLE IF EXISTS "task_dependencies";
DROP TYPE IF EXISTS "DependencyType";
