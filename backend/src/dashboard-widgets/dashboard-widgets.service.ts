import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WidgetType } from '@prisma/client';

export interface UpdateWidgetDto {
  position?: number;
  colSpan?: number;
  rowSpan?: number;
  isActive?: boolean;
  config?: Record<string, any>;
}

const DEFAULT_WIDGETS: { widgetType: WidgetType; position: number; colSpan: number; rowSpan: number }[] = [
  { widgetType: WidgetType.MY_TASKS,          position: 0, colSpan: 2, rowSpan: 1 },
  { widgetType: WidgetType.OVERDUE_TASKS,     position: 1, colSpan: 1, rowSpan: 1 },
  { widgetType: WidgetType.COMPLETED_TASKS,   position: 2, colSpan: 1, rowSpan: 1 },
  { widgetType: WidgetType.ACTIVE_PROJECTS,   position: 3, colSpan: 1, rowSpan: 1 },
  { widgetType: WidgetType.RECENT_ACTIVITY,   position: 4, colSpan: 2, rowSpan: 1 },
  { widgetType: WidgetType.PRODUCTIVITY_CHART,position: 5, colSpan: 2, rowSpan: 1 },
  { widgetType: WidgetType.TEAM_WORKLOAD,     position: 6, colSpan: 2, rowSpan: 1 },
];

@Injectable()
export class DashboardWidgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWidgets(userId: string) {
    const existing = await this.prisma.dashboardWidget.findMany({
      where: { userId },
      orderBy: { position: 'asc' },
    });

    // Se o usuário ainda não tem configuração, cria os defaults
    if (existing.length === 0) {
      await this.prisma.dashboardWidget.createMany({
        data: DEFAULT_WIDGETS.map((w) => ({ ...w, userId })),
      });
      return this.prisma.dashboardWidget.findMany({
        where: { userId },
        orderBy: { position: 'asc' },
      });
    }

    return existing;
  }

  async updateWidget(userId: string, widgetType: WidgetType, dto: UpdateWidgetDto) {
    return this.prisma.dashboardWidget.upsert({
      where: { userId_widgetType: { userId, widgetType } },
      update: dto,
      create: {
        userId,
        widgetType,
        position: dto.position ?? 99,
        colSpan: dto.colSpan ?? 1,
        rowSpan: dto.rowSpan ?? 1,
        isActive: dto.isActive ?? true,
        config: dto.config,
      },
    });
  }

  async reorder(userId: string, order: { widgetType: WidgetType; position: number }[]) {
    await Promise.all(
      order.map(({ widgetType, position }) =>
        this.prisma.dashboardWidget.updateMany({
          where: { userId, widgetType },
          data: { position },
        }),
      ),
    );
    return this.getWidgets(userId);
  }

  async resetToDefault(userId: string) {
    await this.prisma.dashboardWidget.deleteMany({ where: { userId } });
    await this.prisma.dashboardWidget.createMany({
      data: DEFAULT_WIDGETS.map((w) => ({ ...w, userId })),
    });
    return this.getWidgets(userId);
  }

  // ── Dados por widget ──────────────────────────────────────────────────────

  async getWidgetData(userId: string, companyId: string, widgetType: WidgetType) {
    switch (widgetType) {
      case WidgetType.MY_TASKS:
        return this.prisma.task.findMany({
          where: { assigneeId: userId, project: { companyId }, status: { not: 'DONE' } },
          include: { project: { select: { id: true, name: true, color: true } } },
          orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
          take: 5,
        });

      case WidgetType.OVERDUE_TASKS:
        return this.prisma.task.count({
          where: {
            project: { companyId },
            dueDate: { lt: new Date() },
            status: { not: 'DONE' },
          },
        });

      case WidgetType.COMPLETED_TASKS:
        return this.prisma.task.count({
          where: { project: { companyId }, status: 'DONE' },
        });

      case WidgetType.ACTIVE_PROJECTS:
        return this.prisma.project.findMany({
          where: { companyId, isArchived: false },
          include: { _count: { select: { tasks: true } } },
          take: 5,
        });

      case WidgetType.RECENT_ACTIVITY:
        return this.prisma.activity.findMany({
          where: { task: { project: { companyId } } },
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 8,
        });

      case WidgetType.PRODUCTIVITY_CHART: {
        // Tarefas concluídas por dia nos últimos 7 dias
        const days = 7;
        const since = new Date(Date.now() - days * 86_400_000);
        const tasks = await this.prisma.task.findMany({
          where: { project: { companyId }, status: 'DONE', updatedAt: { gte: since } },
          select: { updatedAt: true },
        });
        const byDay: Record<string, number> = {};
        for (let i = 0; i < days; i++) {
          const d = new Date(Date.now() - i * 86_400_000);
          byDay[d.toISOString().slice(0, 10)] = 0;
        }
        for (const t of tasks) {
          const k = t.updatedAt.toISOString().slice(0, 10);
          if (k in byDay) byDay[k]++;
        }
        return Object.entries(byDay)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, count]) => ({ date, count }));
      }

      case WidgetType.TEAM_WORKLOAD:
        return this.prisma.user.findMany({
          where: { companies: { some: { companyId } } },
          select: {
            id: true, name: true, avatarUrl: true,
            _count: { select: { assignedTasks: true } },
          },
          take: 8,
        });

      default:
        return null;
    }
  }
}
