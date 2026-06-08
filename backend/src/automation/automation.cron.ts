import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EVENTS } from '../events/agilis-events';

@Injectable()
export class AutomationCron {
  private readonly logger = new Logger(AutomationCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  /** Verifica tarefas atrasadas a cada 15 minutos */
  @Cron('*/15 * * * *')
  async checkOverdueTasks() {
    const overdue = await this.prisma.task.findMany({
      where: {
        dueDate: { lt: new Date() },
        status: { not: 'DONE' },
      },
      include: { project: true },
    });

    for (const task of overdue) {
      this.events.emit(EVENTS.TASK_OVERDUE, {
        task,
        companyId: task.project.companyId,
      });

      // Atualiza SLA se existir
      await this.prisma.slaRecord.upsert({
        where: { taskId: task.id },
        update: { isBreached: true },
        create: {
          taskId: task.id,
          isBreached: true,
          delayMinutes: task.dueDate
            ? Math.floor((Date.now() - task.dueDate.getTime()) / 60000)
            : null,
        },
      }).catch(() => {});
    }

    if (overdue.length > 0) {
      this.logger.log(`Processed ${overdue.length} overdue tasks`);
    }
  }
}
