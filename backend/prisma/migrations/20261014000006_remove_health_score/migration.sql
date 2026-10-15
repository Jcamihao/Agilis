-- DropForeignKey
ALTER TABLE "health_scores" DROP CONSTRAINT "health_scores_companyId_fkey";

-- DropTable
DROP TABLE "health_scores";

-- DropEnum
DROP TYPE "HealthEntity";

