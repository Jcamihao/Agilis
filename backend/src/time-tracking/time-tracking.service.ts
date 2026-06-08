import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StartTimerDto, StopTimerDto, ManualEntryDto, UpdateTimeEntryDto } from './dto/time-tracking.dto';

const USER_SELECT = { id: true, name: true, avatarUrl: true };

@Injectable()
export class TimeTrackingService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Start timer ───────────────────────────────────────────────────────────
  async startTimer(taskId: string, userId: string, dto: StartTimerDto) {
    await this.assertTaskAccess(taskId, userId);

    const running = await this.prisma.timeEntry.findFirst({
      where: { taskId, userId, endedAt: null },
    });
    if (running) throw new ConflictException('Você já tem um timer rodando nesta tarefa');

    return this.prisma.timeEntry.create({
      data: { taskId, userId, startedAt: new Date(), description: dto.description },
      include: { user: { select: USER_SELECT } },
    });
  }

  // ── Stop timer ────────────────────────────────────────────────────────────
  async stopTimer(taskId: string, userId: string, dto: StopTimerDto) {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { taskId, userId, endedAt: null },
    });
    if (!entry) throw new NotFoundException('Nenhum timer ativo para esta tarefa');

    const endedAt = new Date();
    const durationMin = Math.max(1, Math.round((endedAt.getTime() - entry.startedAt.getTime()) / 60_000));

    return this.prisma.timeEntry.update({
      where: { id: entry.id },
      data: {
        endedAt,
        durationMin,
        description: dto.description ?? entry.description,
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  // ── Manual entry ──────────────────────────────────────────────────────────
  async addManual(taskId: string, userId: string, dto: ManualEntryDto) {
    await this.assertTaskAccess(taskId, userId);

    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    const endedAt = new Date(startedAt.getTime() + dto.durationMin * 60_000);

    return this.prisma.timeEntry.create({
      data: {
        taskId, userId,
        startedAt,
        endedAt,
        durationMin: dto.durationMin,
        description: dto.description,
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  // ── Update entry ──────────────────────────────────────────────────────────
  async updateEntry(entryId: string, userId: string, dto: UpdateTimeEntryDto) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Entrada não encontrada');
    if (entry.userId !== userId) throw new ForbiddenException('Sem permissão para editar esta entrada');

    return this.prisma.timeEntry.update({
      where: { id: entryId },
      data: dto,
      include: { user: { select: USER_SELECT } },
    });
  }

  // ── Delete entry ──────────────────────────────────────────────────────────
  async deleteEntry(entryId: string, userId: string) {
    const entry = await this.prisma.timeEntry.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Entrada não encontrada');
    if (entry.userId !== userId) throw new ForbiddenException('Sem permissão para deletar esta entrada');
    return this.prisma.timeEntry.delete({ where: { id: entryId } });
  }

  // ── List by task ──────────────────────────────────────────────────────────
  async listByTask(taskId: string, userId: string) {
    await this.assertTaskAccess(taskId, userId);

    const entries = await this.prisma.timeEntry.findMany({
      where: { taskId },
      include: { user: { select: USER_SELECT } },
      orderBy: { startedAt: 'desc' },
    });

    const totalMin = entries.reduce((s, e) => s + (e.durationMin ?? 0), 0);
    const activeTimer = entries.find((e) => !e.endedAt) ?? null;

    return { entries, totalMin, activeTimer };
  }

  // ── Running timer for current user on task ────────────────────────────────
  async getActiveTimer(taskId: string, userId: string) {
    return this.prisma.timeEntry.findFirst({
      where: { taskId, userId, endedAt: null },
      include: { user: { select: USER_SELECT } },
    });
  }

  // ── Project report ────────────────────────────────────────────────────────
  async projectReport(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.assertCompanyAccess(project.companyId, userId);

    const entries = await this.prisma.timeEntry.findMany({
      where: { task: { projectId } },
      include: {
        user: { select: USER_SELECT },
        task: { select: { id: true, title: true, status: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Group by task
    const byTask = new Map<string, { task: any; entries: any[]; totalMin: number }>();
    for (const e of entries) {
      if (!byTask.has(e.taskId)) byTask.set(e.taskId, { task: e.task, entries: [], totalMin: 0 });
      const row = byTask.get(e.taskId)!;
      row.entries.push(e);
      row.totalMin += e.durationMin ?? 0;
    }

    // Group by user
    const byUser = new Map<string, { user: any; totalMin: number }>();
    for (const e of entries) {
      if (!byUser.has(e.userId)) byUser.set(e.userId, { user: e.user, totalMin: 0 });
      byUser.get(e.userId)!.totalMin += e.durationMin ?? 0;
    }

    const totalMin = entries.reduce((s, e) => s + (e.durationMin ?? 0), 0);

    return {
      totalMin,
      byTask: [...byTask.values()].sort((a, b) => b.totalMin - a.totalMin),
      byUser: [...byUser.values()].sort((a, b) => b.totalMin - a.totalMin),
      recentEntries: entries.slice(0, 50),
    };
  }

  // ── My time log ───────────────────────────────────────────────────────────
  async myLog(userId: string, companyId?: string) {
    return this.prisma.timeEntry.findMany({
      where: {
        userId,
        ...(companyId ? { task: { project: { companyId } } } : {}),
      },
      include: {
        task: { select: { id: true, title: true, status: true, project: { select: { id: true, name: true, color: true } } } },
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private async assertTaskAccess(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    await this.assertCompanyAccess(task.project.companyId, userId);
    return task;
  }

  private async assertCompanyAccess(companyId: string, userId: string) {
    const m = await this.prisma.userCompany.findFirst({ where: { companyId, userId } });
    if (!m) throw new ForbiddenException('Sem acesso');
  }
}
