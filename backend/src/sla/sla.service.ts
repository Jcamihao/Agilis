import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  EVENTS, TaskStatusChangedEvent, CommentCreatedEvent, TaskCreatedEvent
} from '../events/agilis-events';

@Injectable()
export class SlaService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Event hooks ───────────────────────────────────────────────────────────

  @OnEvent(EVENTS.TASK_CREATED)
  async onTaskCreated({ task }: TaskCreatedEvent) {
    await this.prisma.slaRecord.create({
      data: { taskId: task.id, isBreached: false },
    }).catch(() => {});
  }

  @OnEvent(EVENTS.COMMENT_CREATED)
  async onFirstComment({ task }: CommentCreatedEvent) {
    const sla = await this.prisma.slaRecord.findUnique({ where: { taskId: task.id } });
    if (sla && !sla.firstResponseAt) {
      const responseMinutes = Math.floor((Date.now() - task.createdAt.getTime()) / 60000);
      await this.prisma.slaRecord.update({
        where: { taskId: task.id },
        data: { firstResponseAt: new Date(), responseMinutes },
      });
    }
  }

  @OnEvent(EVENTS.TASK_STATUS_CHANGED)
  async onStatusChanged({ task, newStatus }: TaskStatusChangedEvent) {
    if (newStatus !== 'DONE') return;
    const sla = await this.prisma.slaRecord.findUnique({ where: { taskId: task.id } });
    if (!sla) return;

    const resolutionMinutes = Math.floor((Date.now() - task.createdAt.getTime()) / 60000);
    const delayMinutes = task.dueDate && task.dueDate.getTime() < Date.now()
      ? Math.floor((Date.now() - task.dueDate.getTime()) / 60000)
      : null;

    await this.prisma.slaRecord.update({
      where: { taskId: task.id },
      data: {
        resolvedAt: new Date(),
        resolutionMinutes,
        delayMinutes,
        isBreached: !!delayMinutes && delayMinutes > 0,
      },
    });
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async getForTask(taskId: string) {
    return this.prisma.slaRecord.findUnique({ where: { taskId } });
  }

  async getSummary(companyId: string) {
    const records = await this.prisma.slaRecord.findMany({
      where: { task: { project: { companyId } } },
      select: {
        isBreached: true,
        responseMinutes: true,
        resolutionMinutes: true,
        delayMinutes: true,
        resolvedAt: true,
      },
    });

    const total = records.length;
    const breached = records.filter((r) => r.isBreached).length;
    const resolved = records.filter((r) => r.resolvedAt).length;

    const avgResponse = avg(records.map((r) => r.responseMinutes).filter(Boolean) as number[]);
    const avgResolution = avg(records.map((r) => r.resolutionMinutes).filter(Boolean) as number[]);
    const avgDelay = avg(records.map((r) => r.delayMinutes).filter(Boolean) as number[]);

    return {
      total,
      breached,
      breachRate: total > 0 ? Math.round((breached / total) * 100) : 0,
      resolved,
      avgResponseMinutes: avgResponse,
      avgResolutionMinutes: avgResolution,
      avgDelayMinutes: avgDelay,
    };
  }

  async getBreached(companyId: string, limit = 20) {
    return this.prisma.slaRecord.findMany({
      where: { isBreached: true, task: { project: { companyId }, status: { not: 'DONE' } } },
      include: {
        task: {
          select: {
            id: true, title: true, dueDate: true, priority: true,
            assignee: { select: { id: true, name: true, avatarUrl: true } },
            project: { select: { id: true, name: true, color: true } },
          },
        },
      },
      orderBy: { delayMinutes: 'desc' },
      take: limit,
    });
  }
}

function avg(arr: number[]): number | null {
  if (!arr.length) return null;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}
