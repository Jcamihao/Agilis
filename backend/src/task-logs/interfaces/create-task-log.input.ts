import { Prisma, TaskLogAction, TaskStatus } from '@prisma/client';

export interface CreateTaskLogInput {
  taskId: string;
  organizationId: string;
  action: TaskLogAction;
  description: string;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
  performedById?: string;
  client?: Prisma.TransactionClient;
}
