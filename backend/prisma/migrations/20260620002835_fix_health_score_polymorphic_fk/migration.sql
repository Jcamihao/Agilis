-- DropForeignKey
ALTER TABLE "health_scores" DROP CONSTRAINT "hs_project_fk";

-- DropForeignKey
ALTER TABLE "health_scores" DROP CONSTRAINT "hs_team_fk";

-- DropForeignKey
ALTER TABLE "intake_forms" DROP CONSTRAINT "intake_forms_createdById_fkey";

-- DropForeignKey
ALTER TABLE "task_approvals" DROP CONSTRAINT "task_approvals_requestedById_fkey";

-- DropForeignKey
ALTER TABLE "wiki_page_revisions" DROP CONSTRAINT "wiki_page_revisions_authorId_fkey";

-- DropForeignKey
ALTER TABLE "wiki_pages" DROP CONSTRAINT "wiki_pages_createdById_fkey";

-- DropForeignKey
ALTER TABLE "wiki_pages" DROP CONSTRAINT "wiki_pages_updatedById_fkey";

-- AlterTable
ALTER TABLE "custom_fields" ALTER COLUMN "options" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wiki_page_revisions" ADD CONSTRAINT "wiki_page_revisions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_forms" ADD CONSTRAINT "intake_forms_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_approvals" ADD CONSTRAINT "task_approvals_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
