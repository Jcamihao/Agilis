import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RedisService } from '../redis/redis.service';
import { OkrsService } from '../okrs/okrs.service';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto, MoveTaskDto, CreateSubtaskDto, AddDependencyDto, BulkUpdateTasksDto } from './dto/create-task.dto';
import { DependencyType, TaskStatus } from '@prisma/client';
import { EVENTS } from '../events/agilis-events';

const TASKS_CACHE_TTL = 30;

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
    private readonly okrs: OkrsService,
  ) {}

  async findByProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.checkCompanyAccess(project.companyId, userId);

    const cacheKey = `tasks:project:${projectId}`;
    const cached = await this.redis.get<any>(cacheKey);
    if (cached) return cached;

    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: {
        assignee:  { select: { id: true, name: true, avatarUrl: true } },
        creator:   { select: { id: true, name: true } },
        sprint:    { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
        labels:    { include: { label: true } },
        blockedBy: { select: { dependsOnId: true, type: true } },
        _count:    { select: { comments: true, subtasks: true, timeEntries: true } },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });

    const grouped = {
      BACKLOG:     tasks.filter((t) => t.status === 'BACKLOG'),
      IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS'),
      IN_REVIEW:   tasks.filter((t) => t.status === 'IN_REVIEW'),
      DONE:        tasks.filter((t) => t.status === 'DONE'),
    };

    await this.redis.set(cacheKey, grouped, TASKS_CACHE_TTL);
    return grouped;
  }

  private invalidateProjectCache(projectId: string) {
    this.redis.del(`tasks:project:${projectId}`).catch(() => {});
  }

  async findMyTasks(userId: string, companyId?: string) {
    return this.prisma.task.findMany({
      where: {
        assigneeId: userId,
        ...(companyId ? { project: { companyId } } : {}),
        status: { not: TaskStatus.DONE },
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        project: true,
        assignee: { select: { id: true, name: true, avatarUrl: true, email: true } },
        creator: { select: { id: true, name: true, avatarUrl: true } },
        sprint: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
        labels: { include: { label: true } },
        comments: true,
        activities: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        participants: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } } },
        },
        subtasks: {
          include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
        blockedBy: {
          include: { dependsOn: { select: { id: true, title: true, status: true, priority: true } } },
        },
        blocking: {
          include: { task: { select: { id: true, title: true, status: true, priority: true } } },
        },
      },
    });

    if (!task) throw new NotFoundException('Tarefa não encontrada');
    await this.checkCompanyAccess(task.project.companyId, userId);
    return task;
  }

  async addParticipant(taskId: string, participantId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    await this.checkCompanyAccess(task.project.companyId, userId);

    await this.prisma.taskParticipant.upsert({
      where: { taskId_userId: { taskId, userId: participantId } },
      create: { taskId, userId: participantId },
      update: {},
    });
    return this.findOne(taskId, userId);
  }

  async removeParticipant(taskId: string, participantId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    await this.checkCompanyAccess(task.project.companyId, userId);

    await this.prisma.taskParticipant.deleteMany({ where: { taskId, userId: participantId } });
    return this.findOne(taskId, userId);
  }

  async create(dto: CreateTaskDto, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.checkCompanyAccess(project.companyId, userId);

    const lastTask = await this.prisma.task.findFirst({
      where: { projectId: dto.projectId, status: dto.status || 'BACKLOG' },
      orderBy: { position: 'desc' },
    });

    const position = lastTask ? lastTask.position + 1000 : 1000;

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status || 'BACKLOG',
        priority: dto.priority || 'MEDIUM',
        position,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        projectId: dto.projectId,
        assigneeId: dto.assigneeId,
        creatorId: userId,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        creator: { select: { id: true, name: true } },
      },
    });

    await this.createActivity(task.id, userId, 'task_created', 'task');

    const actor = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
    this.events.emit(EVENTS.TASK_CREATED, { task, actor, companyId: project.companyId });
    if (dto.assigneeId && dto.assigneeId !== userId) {
      this.events.emit(EVENTS.TASK_ASSIGNED, { task, assigneeId: dto.assigneeId, actor, companyId: project.companyId });
    }

    this.audit.log({ userId, companyId: project.companyId, action: 'CREATE', entityType: 'task', entityId: task.id, newValues: { title: task.title, status: task.status, priority: task.priority } });
    this.invalidateProjectCache(dto.projectId);

    return task;
  }

  async update(id: string, dto: UpdateTaskDto | Partial<CreateTaskDto>, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    await this.checkCompanyAccess(task.project.companyId, userId);

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        startDate: (dto as any).startDate ? new Date((dto as any).startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await this.createActivity(id, userId, 'task_updated', 'task');
    if ((dto as any).assigneeId && (dto as any).assigneeId !== task.assigneeId && (dto as any).assigneeId !== userId) {
      const actor = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
      this.events.emit(EVENTS.TASK_ASSIGNED, { task: updated, assigneeId: (dto as any).assigneeId, actor, companyId: task.project.companyId });
    }
    this.invalidateProjectCache(task.project.id);
    return updated;
  }

  async moveTask(id: string, dto: MoveTaskDto, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    await this.checkCompanyAccess(task.project.companyId, userId);

    const updated = await this.prisma.task.update({
      where: { id },
      data: { status: dto.status, position: dto.position },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await this.createActivity(id, userId, 'status_changed', 'task', { from: task.status, to: dto.status });

    const actor = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true } });
    this.events.emit(EVENTS.TASK_STATUS_CHANGED, {
      task: updated, oldStatus: task.status, newStatus: dto.status, actor, companyId: task.project.companyId,
    });
    this.audit.log({ userId, companyId: task.project.companyId, action: 'STATUS_CHANGE', entityType: 'task', entityId: id, oldValues: { status: task.status }, newValues: { status: dto.status } });
    this.invalidateProjectCache(task.project.id);
    this.okrs.syncKeyResultFromTasks(id).catch(() => {});

    return updated;
  }

  async delete(id: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    await this.checkCompanyAccess(task.project.companyId, userId);

    this.invalidateProjectCache(task.project.id);
    return this.prisma.task.delete({ where: { id } });
  }

  // ── Bulk update ──────────────────────────────────────────────────────────

  async bulkUpdate(dto: BulkUpdateTasksDto, userId: string) {
    const { ids, ...updates } = dto;
    if (ids.length === 0) return { count: 0 };

    const data: Record<string, unknown> = {};
    if (updates.status    !== undefined) data['status']     = updates.status;
    if (updates.priority  !== undefined) data['priority']   = updates.priority;
    if ('assigneeId' in updates)         data['assigneeId'] = updates.assigneeId ?? null;
    if ('sprintId'   in updates)         data['sprintId']   = updates.sprintId   ?? null;

    const tasks = await this.prisma.task.findMany({
      where: { id: { in: ids } },
      include: { project: true },
    });

    const companyIds = [...new Set(tasks.map((t) => t.project.companyId))];
    for (const cid of companyIds) {
      await this.checkCompanyAccess(cid, userId);
    }

    const result = await this.prisma.task.updateMany({ where: { id: { in: ids } }, data });

    const projectIds = [...new Set(tasks.map((t) => t.project.id))];
    projectIds.forEach((pid) => this.invalidateProjectCache(pid));

    return { count: result.count };
  }

  // ── Subtasks ──────────────────────────────────────────────────────────────

  async listSubtasks(parentId: string, userId: string) {
    const parent = await this.prisma.task.findUnique({ where: { id: parentId }, include: { project: true } });
    if (!parent) throw new NotFoundException('Tarefa não encontrada');
    await this.checkCompanyAccess(parent.project.companyId, userId);

    return this.prisma.task.findMany({
      where: { parentId },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createSubtask(parentId: string, dto: CreateSubtaskDto, userId: string) {
    const parent = await this.prisma.task.findUnique({ where: { id: parentId }, include: { project: true } });
    if (!parent) throw new NotFoundException('Tarefa pai não encontrada');
    await this.checkCompanyAccess(parent.project.companyId, userId);

    const subtask = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? 'MEDIUM',
        status: 'BACKLOG',
        position: 0,
        projectId: parent.projectId,
        parentId,
        creatorId: userId,
        assigneeId: dto.assigneeId,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    this.invalidateProjectCache(parent.projectId);
    return subtask;
  }

  async deleteSubtask(parentId: string, subtaskId: string, userId: string) {
    const subtask = await this.prisma.task.findUnique({ where: { id: subtaskId }, include: { project: true } });
    if (!subtask || subtask.parentId !== parentId) throw new NotFoundException('Subtarefa não encontrada');
    await this.checkCompanyAccess(subtask.project.companyId, userId);

    this.invalidateProjectCache(subtask.projectId);
    return this.prisma.task.delete({ where: { id: subtaskId } });
  }

  // ── Dependencies ──────────────────────────────────────────────────────────

  async listDependencies(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    await this.checkCompanyAccess(task.project.companyId, userId);

    const [blockedBy, blocking] = await Promise.all([
      this.prisma.taskDependency.findMany({
        where: { taskId },
        include: { dependsOn: { select: { id: true, title: true, status: true, priority: true } } },
      }),
      this.prisma.taskDependency.findMany({
        where: { dependsOnId: taskId },
        include: { task: { select: { id: true, title: true, status: true, priority: true } } },
      }),
    ]);

    return { blockedBy, blocking };
  }

  async addDependency(taskId: string, dto: AddDependencyDto, userId: string) {
    if (taskId === dto.dependsOnId) throw new ConflictException('Uma tarefa não pode depender de si mesma');

    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    await this.checkCompanyAccess(task.project.companyId, userId);

    return this.prisma.taskDependency.create({
      data: { taskId, dependsOnId: dto.dependsOnId, type: dto.type ?? DependencyType.BLOCKS },
      include: { dependsOn: { select: { id: true, title: true, status: true } } },
    });
  }

  async removeDependency(taskId: string, dependsOnId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    await this.checkCompanyAccess(task.project.companyId, userId);

    await this.prisma.taskDependency.deleteMany({ where: { taskId, dependsOnId } });
  }

  // ── Recurrence cron ──────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleRecurrence() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recurring = await this.prisma.task.findMany({
      where: { recurrence: { not: 'NONE' }, status: 'DONE' },
    });

    for (const task of recurring) {
      if (!task.dueDate) continue;

      const nextDue = new Date(task.dueDate);
      switch (task.recurrence) {
        case 'DAILY':     nextDue.setDate(nextDue.getDate() + 1);  break;
        case 'WEEKLY':    nextDue.setDate(nextDue.getDate() + 7);  break;
        case 'BIWEEKLY':  nextDue.setDate(nextDue.getDate() + 14); break;
        case 'MONTHLY':   nextDue.setMonth(nextDue.getMonth() + 1); break;
        default: continue;
      }

      if (nextDue <= today) continue;

      const alreadyExists = await this.prisma.task.findFirst({
        where: { recurrenceParentId: task.id, dueDate: nextDue },
      });
      if (alreadyExists) continue;

      await this.prisma.task.create({
        data: {
          title:             task.title,
          description:       task.description,
          priority:          task.priority,
          status:            'BACKLOG',
          position:          0,
          projectId:         task.projectId,
          assigneeId:        task.assigneeId,
          sprintId:          task.sprintId,
          dueDate:           nextDue,
          recurrence:        task.recurrence,
          recurrenceParentId: task.id,
          creatorId:         task.creatorId,
        },
      });
    }
  }

  private async checkCompanyAccess(companyId: string, userId: string) {
    const membership = await this.prisma.userCompany.findFirst({ where: { companyId, userId } });
    if (!membership) throw new ForbiddenException('Sem acesso a esta tarefa');
  }

  private async createActivity(
    taskId: string,
    userId: string,
    action: string,
    entityType: string,
    metadata?: any,
  ) {
    await this.prisma.activity.create({
      data: { action, entityType, entityId: taskId, taskId, userId, metadata },
    }).catch(() => {});
  }
}
