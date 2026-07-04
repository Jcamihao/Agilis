CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "task_approvals" (
    "id"            TEXT NOT NULL,
    "taskId"        TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approverId"    TEXT,
    "status"        "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "note"          TEXT,
    "reviewNote"    TEXT,
    "targetStatus"  "TaskStatus",
    "resolvedAt"    TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "task_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "task_approvals_taskId_idx"          ON "task_approvals"("taskId");
CREATE INDEX "task_approvals_approverId_status_idx" ON "task_approvals"("approverId", "status");
CREATE INDEX "task_approvals_requestedById_idx"   ON "task_approvals"("requestedById");

ALTER TABLE "task_approvals" ADD CONSTRAINT "task_approvals_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_approvals" ADD CONSTRAINT "task_approvals_requestedById_fkey"
    FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON UPDATE CASCADE;

ALTER TABLE "task_approvals" ADD CONSTRAINT "task_approvals_approverId_fkey"
    FOREIGN KEY ("approverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
