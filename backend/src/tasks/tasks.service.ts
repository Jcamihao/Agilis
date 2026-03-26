import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, Role, TaskLogAction, TaskStatus } from '@prisma/client';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { TaskLogsService } from '../task-logs/task-logs.service';
import { UsersService } from '../users/users.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { TaskResponseDto, TaskResponseSource } from './dto/task-response.dto';
import { buildTaskOperationalSnapshot } from './task-insights.util';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly taskLogsService: TaskLogsService,
  ) {}

  async create(
    organizationId: string,
    actor: AuthenticatedUser,
    dto: CreateTaskDto,
  ): Promise<TaskResponseDto> {
    await this.usersService.findByIdWithinOrganization(dto.assignedToId, organizationId);

    const task = await this.prisma.$transaction(async (transaction) => {
      const createdTask = await transaction.task.create({
        data: {
          title: dto.title,
          description: dto.description,
          dueDate: new Date(dto.dueDate),
          assignedToId: dto.assignedToId,
          createdById: actor.id,
          organizationId,
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

  async findAll(
    organizationId: string,
    query: ListTasksQueryDto,
  ): Promise<TaskResponseDto[]> {
    const tasks = await this.prisma.task.findMany({
      where: {
        organizationId,
        status: query.status,
        assignedToId: query.assignedToId,
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
    });

    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada.');
    }

    this.assertCanUpdateTask(actor, task.assignedToId);

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
            assignedTo: task.assignedTo,
            logs: task.logs,
          },
          now,
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
              description: `Cobranca automatica enviada para ${task.assignedTo.name}. Acao recomendada: ${snapshot.priority.recommendedAction}`,
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

  private assertCanUpdateTask(actor: AuthenticatedUser, assignedToId: string): void {
    if (actor.role === Role.ADMIN || actor.role === Role.MANAGER) {
      return;
    }

    if (actor.id === assignedToId) {
      return;
    }

    throw new ForbiddenException(
      'Voce nao possui permissao para atualizar esta tarefa.',
    );
  }
}
