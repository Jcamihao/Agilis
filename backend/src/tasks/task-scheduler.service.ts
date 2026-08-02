import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EVENTS } from '../events/agilis-events';

@Injectable()
export class TaskSchedulerService {
  private readonly log = new Logger(TaskSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkDueDates() {
    const now   = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const overdue = await this.prisma.task.findMany({
      where: {
        dueDate:    { lt: now },
        status:     { not: 'DONE' },
        assigneeId: { not: null },
      },
      include: { project: { select: { companyId: true } } },
    });

    for (const task of overdue) {
      this.events.emit(EVENTS.TASK_OVERDUE, { task, companyId: task.project.companyId });
    }

    const dueSoon = await this.prisma.task.findMany({
      where: {
        dueDate:    { gte: now, lte: in24h },
        status:     { not: 'DONE' },
        assigneeId: { not: null },
      },
      include: { project: { select: { companyId: true } } },
    });

    for (const task of dueSoon) {
      this.events.emit(EVENTS.TASK_DUE_SOON, { task, companyId: task.project.companyId });
    }

    if (overdue.length || dueSoon.length) {
      this.log.log(`Due dates: ${overdue.length} overdue, ${dueSoon.length} due soon`);
    }
  }
}
