import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Por usuário ────────────────────────────────────────────────────────────

  async getUserMetrics(userId: string, companyId: string, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);

    const [completed, overdue, inProgress, backlog, productivity] = await Promise.all([
      this.prisma.task.count({
        where: { assigneeId: userId, project: { companyId }, status: 'DONE', updatedAt: { gte: since } },
      }),

      this.prisma.task.count({
        where: {
          assigneeId: userId, project: { companyId },
          dueDate: { lt: new Date() }, status: { not: 'DONE' },
        },
      }),

      this.prisma.task.count({
        where: { assigneeId: userId, project: { companyId }, status: 'IN_PROGRESS' },
      }),

      this.prisma.task.count({
        where: { assigneeId: userId, project: { companyId }, status: 'BACKLOG' },
      }),

      // Completed per day (last 14 days)
      this.getCompletedPerDay(userId, companyId, 14),
    ]);

    const total = completed + overdue + inProgress + backlog;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { userId, completed, overdue, inProgress, backlog, completionRate, productivity, days };
  }

  async getAllUsersMetrics(companyId: string, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);

    const members = await this.prisma.userCompany.findMany({
      where: { companyId },
      include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } } },
    });

    const metrics = await Promise.all(
      members.map(async (m) => {
        const [completed, total, overdue] = await Promise.all([
          this.prisma.task.count({
            where: { assigneeId: m.userId, project: { companyId }, status: 'DONE', updatedAt: { gte: since } },
          }),
          this.prisma.task.count({
            where: { assigneeId: m.userId, project: { companyId } },
          }),
          this.prisma.task.count({
            where: { assigneeId: m.userId, project: { companyId }, dueDate: { lt: new Date() }, status: { not: 'DONE' } },
          }),
        ]);

        return {
          user: m.user,
          role: m.role,
          completed,
          total,
          overdue,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
      }),
    );

    return metrics.sort((a, b) => b.completionRate - a.completionRate);
  }

  // ── Por equipe ─────────────────────────────────────────────────────────────

  async getTeamMetrics(teamId: string, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);

    const [totalTasks, completedTasks, overdueTasks, backlogTasks, memberCount] = await Promise.all([
      this.prisma.task.count({ where: { project: { teamId } } }),
      this.prisma.task.count({ where: { project: { teamId }, status: 'DONE', updatedAt: { gte: since } } }),
      this.prisma.task.count({ where: { project: { teamId }, dueDate: { lt: new Date() }, status: { not: 'DONE' } } }),
      this.prisma.task.count({ where: { project: { teamId }, status: 'BACKLOG' } }),
      this.prisma.teamMember.count({ where: { teamId } }),
    ]);

    const efficiency = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const backlogRate = totalTasks > 0 ? Math.round((backlogTasks / totalTasks) * 100) : 0;
    const throughput = days > 0 ? Math.round(completedTasks / days * 7) : 0; // per week

    return { teamId, totalTasks, completedTasks, overdueTasks, backlogTasks, memberCount, efficiency, backlogRate, throughput, days };
  }

  async getCompanyMetrics(companyId: string, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);

    const [projects, tasks, done, overdue, byStatus, byPriority, trend] = await Promise.all([
      this.prisma.project.count({ where: { companyId, isArchived: false } }),
      this.prisma.task.count({ where: { project: { companyId } } }),
      this.prisma.task.count({ where: { project: { companyId }, status: 'DONE', updatedAt: { gte: since } } }),
      this.prisma.task.count({ where: { project: { companyId }, dueDate: { lt: new Date() }, status: { not: 'DONE' } } }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: { project: { companyId } },
        _count: { status: true },
      }),
      this.prisma.task.groupBy({
        by: ['priority'],
        where: { project: { companyId }, status: { not: 'DONE' } },
        _count: { priority: true },
      }),
      this.getCompletedPerDay(undefined, companyId, days),
    ]);

    return { projects, tasks, done, overdue, byStatus, byPriority, trend, days };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async getCompletedPerDay(userId: string | undefined, companyId: string, days: number) {
    const since = new Date(Date.now() - days * 86_400_000);

    const tasks = await this.prisma.task.findMany({
      where: {
        ...(userId ? { assigneeId: userId } : {}),
        project: { companyId },
        status: 'DONE',
        updatedAt: { gte: since },
      },
      select: { updatedAt: true },
    });

    const result: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - i * 86_400_000);
      result[d.toISOString().slice(0, 10)] = 0;
    }

    for (const t of tasks) {
      const k = t.updatedAt.toISOString().slice(0, 10);
      if (k in result) result[k]++;
    }

    return Object.entries(result)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }
}
