-- DropForeignKey
ALTER TABLE "dashboard_widgets" DROP CONSTRAINT "dashboard_widgets_userId_fkey";

-- DropTable
DROP TABLE "dashboard_widgets";

-- DropEnum
DROP TYPE "WidgetType";

