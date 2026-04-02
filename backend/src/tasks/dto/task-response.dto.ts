import { Prisma, Role, TaskLogAction, TaskStatus } from '@prisma/client';
import {
  TaskAutomationSnapshot,
  TaskPriorityLabel,
  TaskPrioritySnapshot,
  buildTaskOperationalSnapshot,
} from '../task-insights.util';
import { buildTaskAssigneeLabel } from '../task-assignees.util';

const taskResponseInclude = {
  assignments: {
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  },
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  logs: {
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      performedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  },
} satisfies Prisma.TaskInclude;

export type TaskResponseSource = Prisma.TaskGetPayload<{
  include: typeof taskResponseInclude;
}>;

type UserSummarySource = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type TaskLogResponseSource = Prisma.TaskLogGetPayload<{
  include: {
    performedBy: {
      select: {
        id: true;
        name: true;
        email: true;
        role: true;
      };
    };
  };
}>;

export class TaskUserSummaryDto {
  id!: string;
  name!: string;
  email!: string;
  role!: Role;

  static fromUser(user: UserSummarySource): TaskUserSummaryDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}

export class TaskLogResponseDto {
  id!: string;
  action!: TaskLogAction;
  description!: string;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
  performedBy?: TaskUserSummaryDto;
  createdAt!: Date;

  static fromLog(log: TaskLogResponseSource): TaskLogResponseDto {
    return {
      id: log.id,
      action: log.action,
      description: log.description,
      fromStatus: log.fromStatus ?? undefined,
      toStatus: log.toStatus ?? undefined,
      performedBy: log.performedBy
        ? TaskUserSummaryDto.fromUser(log.performedBy)
        : undefined,
      createdAt: log.createdAt,
    };
  }
}

export class TaskPriorityResponseDto {
  label!: TaskPriorityLabel;
  score!: number;
  reasons!: string[];
  recommendedAction!: string;

  static fromSnapshot(snapshot: TaskPrioritySnapshot): TaskPriorityResponseDto {
    return {
      label: snapshot.label,
      score: snapshot.score,
      reasons: snapshot.reasons,
      recommendedAction: snapshot.recommendedAction,
    };
  }
}

export class TaskAutomationResponseDto {
  reminderCount!: number;
  escalationLevel!: number;
  lastStatusChangeAt!: Date;
  lastReminderAt?: Date;
  lastEscalationAt?: Date;
  idleHours!: number;
  overdueHours!: number;
  dueInHours!: number;
  pendingReminder!: boolean;
  pendingEscalationLevel!: number;

  static fromSnapshot(snapshot: TaskAutomationSnapshot): TaskAutomationResponseDto {
    return {
      reminderCount: snapshot.reminderCount,
      escalationLevel: snapshot.escalationLevel,
      lastStatusChangeAt: snapshot.lastStatusChangeAt,
      lastReminderAt: snapshot.lastReminderAt,
      lastEscalationAt: snapshot.lastEscalationAt,
      idleHours: snapshot.idleHours,
      overdueHours: snapshot.overdueHours,
      dueInHours: snapshot.dueInHours,
      pendingReminder: snapshot.pendingReminder,
      pendingEscalationLevel: snapshot.pendingEscalationLevel,
    };
  }
}

export class TaskResponseDto {
  id!: string;
  title!: string;
  description?: string;
  status!: TaskStatus;
  dueDate!: Date;
  organizationId!: string;
  assignees!: TaskUserSummaryDto[];
  assignedToAll!: boolean;
  assigneeLabel!: string;
  createdBy!: TaskUserSummaryDto;
  logs!: TaskLogResponseDto[];
  priority!: TaskPriorityResponseDto;
  automation!: TaskAutomationResponseDto;
  createdAt!: Date;
  updatedAt!: Date;

  static include = taskResponseInclude;

  static fromTask(task: TaskResponseSource): TaskResponseDto {
    const operationalSnapshot = buildTaskOperationalSnapshot(task);
    const assignees = task.assignments.map((assignment) =>
      TaskUserSummaryDto.fromUser(assignment.user),
    );

    return {
      id: task.id,
      title: task.title,
      description: task.description ?? undefined,
      status: task.status,
      dueDate: task.dueDate,
      organizationId: task.organizationId,
      assignees,
      assignedToAll: task.assignedToAll,
      assigneeLabel: buildTaskAssigneeLabel(task.assignedToAll, assignees),
      createdBy: TaskUserSummaryDto.fromUser(task.createdBy),
      logs: task.logs.map((log) => TaskLogResponseDto.fromLog(log)),
      priority: TaskPriorityResponseDto.fromSnapshot(operationalSnapshot.priority),
      automation: TaskAutomationResponseDto.fromSnapshot(operationalSnapshot.automation),
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}
