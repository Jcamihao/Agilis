import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardOverviewDto } from './dto/dashboard-overview.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(organizationId: string): Promise<DashboardOverviewDto> {
    const [totalUsers, totalTasks, delayedTasks, pendingTasks, inProgressTasks, completedTasks] =
      await Promise.all([
        this.prisma.user.count({
          where: { organizationId },
        }),
        this.prisma.task.count({
          where: { organizationId },
        }),
        this.prisma.task.count({
          where: { organizationId, status: TaskStatus.DELAYED },
        }),
        this.prisma.task.count({
          where: { organizationId, status: TaskStatus.PENDING },
        }),
        this.prisma.task.count({
          where: { organizationId, status: TaskStatus.IN_PROGRESS },
        }),
        this.prisma.task.count({
          where: { organizationId, status: TaskStatus.DONE },
        }),
      ]);

    return {
      totalUsers,
      totalTasks,
      delayedTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      byStatus: [
        { status: TaskStatus.PENDING, total: pendingTasks },
        { status: TaskStatus.IN_PROGRESS, total: inProgressTasks },
        { status: TaskStatus.DELAYED, total: delayedTasks },
        { status: TaskStatus.DONE, total: completedTasks },
      ],
    };
  }
}
