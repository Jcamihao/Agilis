import { TaskStatus } from '@prisma/client';

export class DashboardTaskStatusCountDto {
  status!: TaskStatus;
  total!: number;
}

export class DashboardOverviewDto {
  totalUsers!: number;
  totalTasks!: number;
  delayedTasks!: number;
  pendingTasks!: number;
  inProgressTasks!: number;
  completedTasks!: number;
  byStatus!: DashboardTaskStatusCountDto[];
}
