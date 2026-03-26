import { TaskStatus } from './task.model';

export interface DashboardTaskStatusCount {
  status: TaskStatus;
  total: number;
}

export interface DashboardOverview {
  totalUsers: number;
  totalTasks: number;
  delayedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  byStatus: DashboardTaskStatusCount[];
}
