import { Injectable } from '@nestjs/common';
import { Prisma, TaskLogAction, TaskStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  TaskAutomationResponseDto,
  TaskPriorityResponseDto,
  TaskUserSummaryDto,
} from '../tasks/dto/task-response.dto';
import {
  buildTaskOperationalSnapshot,
  compareTasksByPriority,
} from '../tasks/task-insights.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  CollectionCenterDto,
  CollectionCenterEventDto,
  CollectionCenterItemDto,
  MyFocusTodayDto,
  PriorityEngineDto,
  PrioritySummaryItemDto,
  WorkAssistantOverviewDto,
  WorkAssistantTaskDto,
} from './dto/work-assistant-overview.dto';

const assistantTaskInclude = {
  assignedTo: {
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
    select: {
      id: true,
      action: true,
      description: true,
      createdAt: true,
    },
  },
} satisfies Prisma.TaskInclude;

type AssistantTaskSource = Prisma.TaskGetPayload<{
  include: typeof assistantTaskInclude;
}>;

@Injectable()
export class WorkAssistantService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(user: AuthenticatedUser): Promise<WorkAssistantOverviewDto> {
    const generatedAt = new Date();
    const startOfDay = new Date(generatedAt);
    startOfDay.setHours(0, 0, 0, 0);

    const [activeTasks, recentAutomationLogs, remindersSentToday] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          organizationId: user.organizationId,
          status: {
            not: TaskStatus.DONE,
          },
        },
        include: assistantTaskInclude,
      }),
      this.prisma.taskLog.findMany({
        where: {
          organizationId: user.organizationId,
          action: {
            in: [TaskLogAction.AUTO_REMINDER_SENT, TaskLogAction.AUTO_ESCALATED],
          },
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
      }),
      this.prisma.taskLog.count({
        where: {
          organizationId: user.organizationId,
          action: TaskLogAction.AUTO_REMINDER_SENT,
          createdAt: {
            gte: startOfDay,
          },
        },
      }),
    ]);

    const rankedTasks = [...activeTasks].sort((left, right) =>
      compareTasksByPriority(left, right, generatedAt),
    );
    const operationalTasks = rankedTasks.map((task) => ({
      task,
      snapshot: buildTaskOperationalSnapshot(task, generatedAt),
    }));

    const myOpenTasks = operationalTasks.filter(
      ({ task }) => task.assignedToId === user.id && task.status !== TaskStatus.DONE,
    );
    const myFocusToday: MyFocusTodayDto = {
      totalOpen: myOpenTasks.length,
      dueToday: myOpenTasks.filter(({ task }) => this.isSameDay(task.dueDate, generatedAt))
        .length,
      delayed: myOpenTasks.filter(({ task }) => task.status === TaskStatus.DELAYED).length,
      critical: myOpenTasks.filter(
        ({ snapshot }) => snapshot.priority.label === 'CRITICAL',
      ).length,
      tasks: myOpenTasks.slice(0, 6).map(({ task, snapshot }) =>
        this.toAssistantTaskDto(task, snapshot),
      ),
    };

    const prioritySummary = operationalTasks.reduce(
      (accumulator, { snapshot }) => {
        accumulator[snapshot.priority.label] += 1;
        return accumulator;
      },
      {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      },
    );

    const priorityEngine: PriorityEngineDto = {
      generatedAt,
      critical: prioritySummary.CRITICAL,
      high: prioritySummary.HIGH,
      medium: prioritySummary.MEDIUM,
      low: prioritySummary.LOW,
      topTasks: operationalTasks.slice(0, 8).map(({ task, snapshot }) =>
        this.toAssistantTaskDto(task, snapshot),
      ),
      summary: [
        this.toPrioritySummaryItem('Criticas', prioritySummary.CRITICAL),
        this.toPrioritySummaryItem('Altas', prioritySummary.HIGH),
        this.toPrioritySummaryItem('Medias', prioritySummary.MEDIUM),
        this.toPrioritySummaryItem('Baixas', prioritySummary.LOW),
      ],
    };

    const collectionItems = operationalTasks
      .filter(
        ({ snapshot }) =>
          snapshot.automation.reminderCount > 0 ||
          snapshot.automation.escalationLevel > 0 ||
          snapshot.automation.pendingReminder ||
          snapshot.automation.pendingEscalationLevel > 0,
      )
      .slice(0, 8)
      .map(({ task, snapshot }) => this.toCollectionCenterItem(task, snapshot));

    const collectionCenter: CollectionCenterDto = {
      pendingCharges: operationalTasks.filter(
        ({ snapshot }) =>
          snapshot.automation.pendingReminder ||
          snapshot.automation.pendingEscalationLevel > 0,
      ).length,
      escalatedTasks: operationalTasks.filter(
        ({ snapshot }) => snapshot.automation.escalationLevel > 0,
      ).length,
      remindersSentToday,
      recentEvents: recentAutomationLogs.map((log) => ({
        id: log.id,
        taskId: log.taskId,
        taskTitle: log.task.title,
        action: log.action,
        description: log.description,
        createdAt: log.createdAt,
      })),
      items: collectionItems,
    };

    return {
      generatedAt,
      myFocusToday,
      priorityEngine,
      collectionCenter,
    };
  }

  private toAssistantTaskDto(
    task: AssistantTaskSource,
    snapshot: ReturnType<typeof buildTaskOperationalSnapshot>,
  ): WorkAssistantTaskDto {
    return WorkAssistantTaskDto.fromValues({
      id: task.id,
      title: task.title,
      description: task.description ?? undefined,
      status: task.status,
      dueDate: task.dueDate,
      assignedTo: TaskUserSummaryDto.fromUser(task.assignedTo),
      priority: TaskPriorityResponseDto.fromSnapshot(snapshot.priority),
      automation: TaskAutomationResponseDto.fromSnapshot(snapshot.automation),
    });
  }

  private toCollectionCenterItem(
    task: AssistantTaskSource,
    snapshot: ReturnType<typeof buildTaskOperationalSnapshot>,
  ): CollectionCenterItemDto {
    const lastActionAt =
      snapshot.automation.lastEscalationAt ?? snapshot.automation.lastReminderAt;

    return {
      task: this.toAssistantTaskDto(task, snapshot),
      lastActionAt,
      lastActionLabel:
        snapshot.automation.escalationLevel > 0
          ? `Escalonada nivel ${snapshot.automation.escalationLevel}`
          : snapshot.automation.reminderCount > 0
            ? `${snapshot.automation.reminderCount} cobranca(s) enviada(s)`
            : 'Monitoramento ativo',
      nextStep:
        snapshot.automation.pendingEscalationLevel > 0
          ? 'Escalonar automaticamente para a lideranca no proximo ciclo.'
          : snapshot.automation.pendingReminder
            ? 'Enviar nova cobranca automatica ao responsavel.'
            : snapshot.priority.recommendedAction,
    };
  }

  private toPrioritySummaryItem(
    label: string,
    total: number,
  ): PrioritySummaryItemDto {
    return {
      label,
      total,
    };
  }

  private isSameDay(dateValue: Date, baseDate: Date): boolean {
    return (
      dateValue.getDate() === baseDate.getDate() &&
      dateValue.getMonth() === baseDate.getMonth() &&
      dateValue.getFullYear() === baseDate.getFullYear()
    );
  }
}
