-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM (
  'TEXT', 'NUMBER', 'DATE', 'SELECT', 'MULTI_SELECT', 'CHECKBOX', 'URL', 'EMAIL', 'PHONE'
);

-- CreateTable custom_fields
CREATE TABLE "custom_fields" (
    "id"         TEXT NOT NULL,
    "projectId"  TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "type"       "CustomFieldType" NOT NULL,
    "options"    TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "position"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable custom_field_values
CREATE TABLE "custom_field_values" (
    "id"            TEXT NOT NULL,
    "customFieldId" TEXT NOT NULL,
    "taskId"        TEXT NOT NULL,
    "value"         TEXT,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "custom_field_values_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX  "custom_fields_projectId_position_idx"       ON "custom_fields"("projectId", "position");
CREATE INDEX  "custom_field_values_taskId_idx"              ON "custom_field_values"("taskId");
CREATE UNIQUE INDEX "custom_field_values_customFieldId_taskId_key"
    ON "custom_field_values"("customFieldId", "taskId");

-- Foreign Keys
ALTER TABLE "custom_fields" ADD CONSTRAINT "custom_fields_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_customFieldId_fkey"
    FOREIGN KEY ("customFieldId") REFERENCES "custom_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "custom_field_values" ADD CONSTRAINT "custom_field_values_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
