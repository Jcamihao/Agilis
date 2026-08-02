-- Add recurrence fields to tasks
ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "recurrence" TEXT NOT NULL DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS "recurrence_parent_id" TEXT;

-- Create task_templates table
CREATE TABLE IF NOT EXISTS "task_templates" (
  "id"              TEXT NOT NULL,
  "company_id"      TEXT NOT NULL,
  "name"            TEXT NOT NULL,
  "description"     TEXT,
  "priority"        TEXT NOT NULL DEFAULT 'MEDIUM',
  "checklist"       JSONB NOT NULL DEFAULT '[]',
  "estimated_hours" INTEGER,
  "created_by_id"   TEXT NOT NULL,
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "task_templates_company_id_idx" ON "task_templates"("company_id");

ALTER TABLE "task_templates"
  ADD CONSTRAINT "task_templates_company_id_fkey"
    FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "task_templates_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
