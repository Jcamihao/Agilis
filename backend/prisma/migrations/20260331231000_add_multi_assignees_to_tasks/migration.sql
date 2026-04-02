-- AlterTable
ALTER TABLE "Task" ADD COLUMN "assignedToAll" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "TaskAssignment" (
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("taskId","userId")
);

-- MigrateData
INSERT INTO "TaskAssignment" ("taskId", "userId")
SELECT "id", "assignedToId"
FROM "Task";

-- CreateIndex
CREATE INDEX "TaskAssignment_userId_idx" ON "TaskAssignment"("userId");

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assignedToId_fkey";

-- DropIndex
DROP INDEX "Task_assignedToId_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "assignedToId";
