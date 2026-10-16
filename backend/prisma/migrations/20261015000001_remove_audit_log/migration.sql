-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_companyId_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_userId_fkey";

-- DropTable
DROP TABLE "audit_logs";

-- DropEnum
DROP TYPE "AuditAction";

