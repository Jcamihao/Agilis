import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, Role, TaskLogAction, TaskStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { TaskLogsService } from '../task-logs/task-logs.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { TaskResponseDto, TaskResponseSource } from './dto/task-response.dto';
import { buildTaskAssigneeLabel } from './task-assignees.util';
import { buildTaskOperationalSnapshot } from './task-insights.util';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskLogsService: TaskLogsService,
  ) {}

  async create(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    const assignment = await this.resolveTaskAssignmentInput(
      organizationId,
      {
        assignedToAll: dto.assignedToAll,
        assignedToIds: dto.assignedToIds,
      },
      true,
    );

    if (!assignment) {
      throw new BadRequestException(
        'Selecione ao menos um responsavel ou a opcao TODOS.',
      );
    }

    const task = await this.prisma.$transaction(async (transaction) => {
      const createdTask = await transaction.task.create({
        data: {
          title: dto.title,
          description: dto.description,
          dueDate: new Date(dto.dueDate),
          assignedToAll: assignment.assignedToAll,
          createdById: actor.id,
          organizationId,
          assignments:
            assignment.assignedToIds.length > 0
              ? {
                  create: assignment.assignedToIds.map((userId) => ({
                    userId,
                  })),
                }
              : undefined,
        },
      });

      await this.taskLogsService.create({
        client: transaction,
        taskId: createdTask.id,
        organizationId,
        action: TaskLogAction.CREATED,
        description: 'Tarefa criada.',
        toStatus: createdTask.status,
        performedById: actor.id,
      });

      return createdTask;
    });

    return this.findOneById(task.id, organizationId);
  }

  async update(
    organizationId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId,
      },
    });

    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada.');
    }

    const assignment = await this.resolveTaskAssignmentInput(
      organizationId,
      {
        assignedToAll: dto.assignedToAll,
        assignedToIds: dto.assignedToIds,
      },
      false,
    );

    await this.prisma.$transaction(async (transaction) => {
      await transaction.task.update({
        where: { id: task.id },
        data: {
          title: dto.title,
          description: dto.description === undefined ? undefined : dto.description || null,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          assignedToAll: assignment?.assignedToAll,
        },
      });

      if (!assignment) {
        return;
      }

      await transaction.taskAssignment.deleteMany({
        where: {
          taskId: task.id,
        },
      });

      if (assignment.assignedToIds.length === 0) {
        return;
      }

      await transaction.taskAssignment.createMany({
        data: assignment.assignedToIds.map((userId) => ({
          taskId: task.id,
          userId,
        })),
      });
    });

    return this.findOneById(task.id, organizationId);
  }

  async findAll(
    actor: AuthenticatedUser,
    query: ListTasksQueryDto,
  ): Promise<TaskResponseDto[]> {
    if (
      actor.role === Role.USER &&
      query.assignedToId &&
      query.assignedToId !== actor.id
    ) {
      throw new ForbiddenException(
        'Voce nao possui permissao para visualizar tarefas de outro usuario.',
      );
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        organizationId: actor.organizationId,
        status: query.status,
        AND: [
          this.buildVisibilityFilter(actor),
          this.buildAssigneeFilter(query.assignedToId),
        ].filter((filter): filter is Prisma.TaskWhereInput => Boolean(filter)),
        title: query.search
          ? {
              contains: query.search,
              mode: Prisma.QueryMode.insensitive,
            }
          : undefined,
      },
      include: TaskResponseDto.include,
      orderBy: [
        {
          dueDate: 'asc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });

    return tasks.map((task) => TaskResponseDto.fromTask(task));
  }

  async updateStatus(
    organizationId: string,
    actor: AuthenticatedUser,
    taskId: string,
    dto: UpdateTaskStatusDto,
  ): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId,
      },
      include: {
        assignments: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada.');
    }

    this.assertCanUpdateTask(
      actor,
      task.assignedToAll,
      task.assignments.map((assignment) => assignment.userId),
    );

    if (task.status === dto.status) {
      return this.findOneById(taskId, organizationId);
    }

    await this.prisma.$transaction(async (transaction) => {
      await transaction.task.update({
        where: { id: task.id },
        data: {
          status: dto.status,
        },
      });

      await this.taskLogsService.create({
        client: transaction,
        taskId: task.id,
        organizationId,
        action: TaskLogAction.STATUS_CHANGED,
        description: 'Status da tarefa atualizado manualmente.',
        fromStatus: task.status,
        toStatus: dto.status,
        performedById: actor.id,
      });
    });

    return this.findOneById(task.id, organizationId);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async markOverdueTasksAsDelayed(): Promise<void> {
    const overdueTasks = await this.prisma.task.findMany({
      where: {
        dueDate: {
          lt: new Date(),
        },
        status: {
          in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS],
        },
      },
      select: {
        id: true,
        organizationId: true,
        status: true,
      },
    });

    await Promise.all(
      overdueTasks.map((task) =>
        this.prisma.$transaction(async (transaction) => {
          await transaction.task.update({
            where: {
              id: task.id,
            },
            data: {
              status: TaskStatus.DELAYED,
            },
          });

          await this.taskLogsService.create({
            client: transaction,
            taskId: task.id,
            organizationId: task.organizationId,
            action: TaskLogAction.AUTO_DELAYED,
            description: 'Tarefa marcada automaticamente como atrasada.',
            fromStatus: task.status,
            toStatus: TaskStatus.DELAYED,
          });
        }),
      ),
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processAutomaticCollections(): Promise<void> {
    const now = new Date();
    const activeTasks = await this.prisma.task.findMany({
      where: {
        status: {
          not: TaskStatus.DONE,
        },
      },
      include: {
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
        logs: {
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            action: true,
            description: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    await Promise.all(
      activeTasks.map(async (task) => {
        const snapshot = buildTaskOperationalSnapshot(
          {
            id: task.id,
            title: task.title,
            status: task.status,
            dueDate: task.dueDate,
            createdAt: task.createdAt,
            logs: task.logs,
          },
          now,
        );
        const assigneeLabel = buildTaskAssigneeLabel(
          task.assignedToAll,
          task.assignments.map((assignment) => assignment.user),
        );

        if (
          !snapshot.automation.pendingReminder &&
          snapshot.automation.pendingEscalationLevel === 0
        ) {
          return;
        }

        await this.prisma.$transaction(async (transaction) => {
          if (snapshot.automation.pendingReminder) {
            await this.taskLogsService.create({
              client: transaction,
              taskId: task.id,
              organizationId: task.organizationId,
              action: TaskLogAction.AUTO_REMINDER_SENT,
              description: `Cobranca automatica enviada para ${assigneeLabel}. Acao recomendada: ${snapshot.priority.recommendedAction}`,
            });
          }

          if (snapshot.automation.pendingEscalationLevel > 0) {
            const nextLevel =
              snapshot.automation.escalationLevel +
              snapshot.automation.pendingEscalationLevel;

            await this.taskLogsService.create({
              client: transaction,
              taskId: task.id,
              organizationId: task.organizationId,
              action: TaskLogAction.AUTO_ESCALATED,
              description:
                nextLevel >= 2
                  ? 'Cobranca automatica escalonada para lideranca executiva e gestores da operacao.'
                  : 'Cobranca automatica escalonada para gestores da operacao.',
            });
          }
        });
      }),
    );
  }

  private async findOneById(
    taskId: string,
    organizationId: string,
  ): Promise<TaskResponseDto> {
    const task = await this.prisma.task.findFirst({
      where: {
        id: taskId,
        organizationId,
      },
      include: TaskResponseDto.include,
    });

    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada.');
    }

    return TaskResponseDto.fromTask(task as TaskResponseSource);
  }

  private async resolveTaskAssignmentInput(
    organizationId: string,
    input: {
      assignedToAll?: boolean;
      assignedToIds?: string[];
    },
    required: boolean,
  ): Promise<{
    assignedToAll: boolean;
    assignedToIds: string[];
  } | null> {
    const includesAllFlag = input.assignedToAll !== undefined;
    const includesIds = input.assignedToIds !== undefined;

    if (!includesAllFlag && !includesIds) {
      if (required) {
        throw new BadRequestException(
          'Selecione ao menos um responsavel ou a opcao TODOS.',
        );
      }

      return null;
    }

    const assignedToAll = input.assignedToAll ?? false;
    const assignedToIds = [...new Set((input.assignedToIds ?? []).filter(Boolean))];

    if (assignedToAll) {
      return {
        assignedToAll: true,
        assignedToIds: [],
      };
    }

    if (assignedToIds.length === 0) {
      throw new BadRequestException(
        'Selecione ao menos um responsavel ou a opcao TODOS.',
      );
    }

    const users = await this.prisma.user.findMany({
      where: {
        id: {
          in: assignedToIds,
        },
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (users.length !== assignedToIds.length) {
      throw new NotFoundException(
        'Um ou mais responsaveis nao pertencem a organizacao.',
      );
    }

    return {
      assignedToAll: false,
      assignedToIds,
    };
  }

  private assertCanUpdateTask(
    actor: AuthenticatedUser,
    assignedToAll: boolean,
    assignedToIds: string[],
  ): void {
    if (actor.role === Role.ADMIN || actor.role === Role.MANAGER) {
      return;
    }

    if (assignedToAll || assignedToIds.includes(actor.id)) {
      return;
    }

    throw new ForbiddenException(
      'Voce nao possui permissao para atualizar esta tarefa.',
    );
  }

  private buildVisibilityFilter(actor: AuthenticatedUser): Prisma.TaskWhereInput | undefined {
    if (actor.role === Role.ADMIN || actor.role === Role.MANAGER) {
      return undefined;
    }

    return {
      OR: [
        { assignedToAll: true },
        {
          assignments: {
            some: {
              userId: actor.id,
            },
          },
        },
      ],
    };
  }

  private buildAssigneeFilter(
    assignedToId?: string,
  ): Prisma.TaskWhereInput | undefined {
    if (!assignedToId) {
      return undefined;
    }

    return {
      OR: [
        { assignedToAll: true },
        {
          assignments: {
            some: {
              userId: assignedToId,
            },
          },
        },
      ],
    };
  }
}
