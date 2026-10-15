-- DropForeignKey
ALTER TABLE "key_result_tasks" DROP CONSTRAINT "key_result_tasks_keyResultId_fkey";

-- DropForeignKey
ALTER TABLE "key_result_tasks" DROP CONSTRAINT "key_result_tasks_taskId_fkey";

-- DropForeignKey
ALTER TABLE "key_results" DROP CONSTRAINT "key_results_objectiveId_fkey";

-- DropForeignKey
ALTER TABLE "objectives" DROP CONSTRAINT "objectives_companyId_fkey";

-- DropForeignKey
ALTER TABLE "objectives" DROP CONSTRAINT "objectives_ownerId_fkey";

-- DropTable
DROP TABLE "key_result_tasks";

-- DropTable
DROP TABLE "key_results";

-- DropTable
DROP TABLE "objectives";

-- DropEnum
DROP TYPE "KeyResultType";

-- DropEnum
DROP TYPE "ObjectiveStatus";

