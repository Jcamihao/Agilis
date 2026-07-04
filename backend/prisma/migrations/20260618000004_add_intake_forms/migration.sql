-- CreateEnum
CREATE TYPE "IntakeFormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
CREATE TYPE "IntakeSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONVERTED');

-- CreateTable intake_forms
CREATE TABLE "intake_forms" (
    "id"             TEXT NOT NULL,
    "projectId"      TEXT NOT NULL,
    "slug"           TEXT NOT NULL,
    "title"          TEXT NOT NULL,
    "description"    TEXT,
    "status"         "IntakeFormStatus" NOT NULL DEFAULT 'DRAFT',
    "fields"         JSONB NOT NULL DEFAULT '[]',
    "submitLabel"    TEXT NOT NULL DEFAULT 'Enviar',
    "successMsg"     TEXT NOT NULL DEFAULT 'Sua solicitação foi recebida. Obrigado!',
    "createdById"    TEXT NOT NULL,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "intake_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable intake_submissions
CREATE TABLE "intake_submissions" (
    "id"             TEXT NOT NULL,
    "formId"         TEXT NOT NULL,
    "data"           JSONB NOT NULL,
    "status"         "IntakeSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "taskId"         TEXT,
    "submitterEmail" TEXT,
    "submittedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "intake_submissions_pkey" PRIMARY KEY ("id")
);

-- Unique & Indexes
CREATE UNIQUE INDEX "intake_forms_slug_key" ON "intake_forms"("slug");
CREATE INDEX "intake_forms_projectId_idx"         ON "intake_forms"("projectId");
CREATE INDEX "intake_submissions_formId_status_idx" ON "intake_submissions"("formId", "status");

-- Foreign Keys
ALTER TABLE "intake_forms" ADD CONSTRAINT "intake_forms_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intake_forms" ADD CONSTRAINT "intake_forms_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_formId_fkey"
    FOREIGN KEY ("formId") REFERENCES "intake_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "intake_submissions" ADD CONSTRAINT "intake_submissions_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
