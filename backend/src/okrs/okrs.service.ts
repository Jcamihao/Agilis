import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateObjectiveDto, UpdateObjectiveDto,
  CreateKeyResultDto, UpdateKeyResultDto,
} from './dto/okr.dto';

@Injectable()
export class OkrsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Objectives ─────────────────────────────────────────────────────────────

  async listObjectives(companyId: string) {
    const objectives = await this.prisma.objective.findMany({
      where: { companyId },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        keyResults: {
          include: {
            tasks: {
              include: { task: { select: { id: true, title: true, status: true } } },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return objectives.map(obj => this.withProgress(obj));
  }

  async getObjective(id: string) {
    const obj = await this.prisma.objective.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, avatarUrl: true } },
        keyResults: {
          include: {
            tasks: {
              include: { task: { select: { id: true, title: true, status: true } } },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!obj) throw new NotFoundException('Objetivo não encontrado');
    return this.withProgress(obj);
  }

  async createObjective(companyId: string, ownerId: string, dto: CreateObjectiveDto) {
    const obj = await this.prisma.objective.create({
      data: {
        companyId,
        ownerId,
        title:       dto.title,
        description: dto.description,
        status:      dto.status ?? 'ACTIVE',
        startDate:   new Date(dto.startDate),
        endDate:     new Date(dto.endDate),
      },
      include: {
        owner:      { select: { id: true, name: true, avatarUrl: true } },
        keyResults: true,
      },
    });
    return this.withProgress(obj);
  }

  async updateObjective(id: string, dto: UpdateObjectiveDto) {
    const obj = await this.prisma.objective.update({
      where: { id },
      data: {
        ...(dto.title       && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status      && { status: dto.status }),
        ...(dto.startDate   && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate     && { endDate:   new Date(dto.endDate) }),
      },
      include: {
        owner:      { select: { id: true, name: true, avatarUrl: true } },
        keyResults: { include: { tasks: { include: { task: { select: { id: true, title: true, status: true } } } } } },
      },
    });
    return this.withProgress(obj);
  }

  async deleteObjective(id: string) {
    return this.prisma.objective.delete({ where: { id } });
  }

  // ── Key Results ────────────────────────────────────────────────────────────

  async createKeyResult(objectiveId: string, dto: CreateKeyResultDto) {
    return this.prisma.keyResult.create({
      data: {
        objectiveId,
        title:        dto.title,
        type:         dto.type ?? 'PERCENTAGE',
        startValue:   dto.startValue ?? 0,
        targetValue:  dto.targetValue,
        currentValue: dto.startValue ?? 0,
        unit:         dto.unit,
      },
    });
  }

  async updateKeyResult(id: string, dto: UpdateKeyResultDto) {
    return this.prisma.keyResult.update({
      where: { id },
      data: {
        ...(dto.title        !== undefined && { title:        dto.title }),
        ...(dto.currentValue !== undefined && { currentValue: dto.currentValue }),
        ...(dto.targetValue  !== undefined && { targetValue:  dto.targetValue }),
        ...(dto.unit         !== undefined && { unit:         dto.unit }),
      },
    });
  }

  async deleteKeyResult(id: string) {
    return this.prisma.keyResult.delete({ where: { id } });
  }

  // ── Link tasks ─────────────────────────────────────────────────────────────

  async linkTasks(keyResultId: string, taskIds: string[]) {
    await this.prisma.keyResultTask.createMany({
      data: taskIds.map(taskId => ({ keyResultId, taskId })),
      skipDuplicates: true,
    });
    return this.prisma.keyResult.findUnique({
      where: { id: keyResultId },
      include: { tasks: { include: { task: { select: { id: true, title: true, status: true } } } } },
    });
  }

  async unlinkTask(keyResultId: string, taskId: string) {
    return this.prisma.keyResultTask.deleteMany({ where: { keyResultId, taskId } });
  }

  // ── Auto-update progress when task completes ───────────────────────────────

  async syncKeyResultFromTasks(taskId: string) {
    const links = await this.prisma.keyResultTask.findMany({
      where: { taskId },
      include: {
        keyResult: {
          include: { tasks: { include: { task: { select: { status: true } } } } },
        },
      },
    });

    for (const link of links) {
      const kr = link.keyResult;
      if (kr.type !== 'PERCENTAGE') continue;

      const total = kr.tasks.length;
      const done  = kr.tasks.filter(t => t.task.status === 'DONE').length;
      const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

      await this.prisma.keyResult.update({
        where: { id: kr.id },
        data:  { currentValue: pct },
      });
    }
  }

  // ── Company summary ───────────────────────────────────────────────────────

  async summary(companyId: string) {
    const objs = await this.listObjectives(companyId);
    const total     = objs.length;
    const active    = objs.filter(o => o.status === 'ACTIVE').length;
    const completed = objs.filter(o => o.status === 'COMPLETED').length;
    const avgProgress = total
      ? Math.round(objs.reduce((s, o) => s + o.progress, 0) / total)
      : 0;
    return { total, active, completed, avgProgress, objectives: objs };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private withProgress(obj: any) {
    const krs: any[] = obj.keyResults ?? [];
    const progress = krs.length
      ? Math.round(krs.reduce((sum, kr) => {
          const pct = kr.targetValue > 0
            ? Math.min(100, (kr.currentValue / kr.targetValue) * 100)
            : 0;
          return sum + pct;
        }, 0) / krs.length)
      : 0;
    return { ...obj, progress };
  }
}
