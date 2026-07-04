import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import {
  EVENTS,
  TaskCreatedEvent,
  TaskStatusChangedEvent,
  TaskAssignedEvent,
  TaskOverdueEvent,
  CommentCreatedEvent,
} from '../events/agilis-events';
import * as crypto from 'crypto';
import { QUEUE_WEBHOOK } from '../queue/queue.constants';
import { WebhookJobData } from '../queue/processors/webhook.processor';

export interface ProcessCompletedEvent {
  processId: string;
  processName: string;
  instanceId: string;
  companyId: string;
}

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_WEBHOOK) private readonly webhookQueue: Queue<WebhookJobData>,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────────────────────

  list(companyId: string) {
    return this.prisma.webhook.findMany({
      where: { companyId },
      include: { _count: { select: { deliveries: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  getOne(id: string) {
    return this.prisma.webhook.findUnique({ where: { id } });
  }

  create(data: { companyId: string; name: string; url: string; events: string[]; secret?: string }) {
    return this.prisma.webhook.create({
      data: {
        companyId: data.companyId,
        name: data.name,
        url: data.url,
        events: data.events,
        secret: data.secret ?? crypto.randomBytes(24).toString('hex'),
        isActive: true,
      },
    });
  }

  update(id: string, data: { name?: string; url?: string; events?: string[]; isActive?: boolean; secret?: string }) {
    return this.prisma.webhook.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.webhook.delete({ where: { id } });
  }

  getDeliveries(webhookId: string, limit = 50) {
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async regenerateSecret(id: string) {
    const secret = crypto.randomBytes(24).toString('hex');
    return this.prisma.webhook.update({ where: { id }, data: { secret } });
  }

  // ── Event Listeners ───────────────────────────────────────────────────────

  @OnEvent(EVENTS.TASK_CREATED)
  async onTaskCreated(e: TaskCreatedEvent) {
    try {
      await this.fireForCompany(e.companyId, EVENTS.TASK_CREATED, {
        taskId: e.task.id,
        taskTitle: e.task.title,
        status: e.task.status,
        priority: e.task.priority,
        projectId: e.task.projectId,
        actorName: e.actor.name,
        actorEmail: e.actor.email,
      });
    } catch (err: any) {
      this.logger.error(`onTaskCreated webhook error: ${err.message}`);
    }
  }

  @OnEvent(EVENTS.TASK_STATUS_CHANGED)
  async onTaskStatusChanged(e: TaskStatusChangedEvent) {
    try {
      await this.fireForCompany(e.companyId, EVENTS.TASK_STATUS_CHANGED, {
        taskId: e.task.id,
        taskTitle: e.task.title,
        oldStatus: e.oldStatus,
        newStatus: e.newStatus,
        projectId: e.task.projectId,
        actorName: e.actor.name,
        actorEmail: e.actor.email,
      });
    } catch (err: any) {
      this.logger.error(`onTaskStatusChanged webhook error: ${err.message}`);
    }
  }

  @OnEvent(EVENTS.TASK_ASSIGNED)
  async onTaskAssigned(e: TaskAssignedEvent) {
    try {
      await this.fireForCompany(e.companyId, EVENTS.TASK_ASSIGNED, {
        taskId: e.task.id,
        taskTitle: e.task.title,
        assigneeId: e.assigneeId,
        projectId: e.task.projectId,
        actorName: e.actor.name,
        actorEmail: e.actor.email,
      });
    } catch (err: any) {
      this.logger.error(`onTaskAssigned webhook error: ${err.message}`);
    }
  }

  @OnEvent(EVENTS.TASK_OVERDUE)
  async onTaskOverdue(e: TaskOverdueEvent) {
    try {
      await this.fireForCompany(e.companyId, EVENTS.TASK_OVERDUE, {
        taskId: e.task.id,
        taskTitle: e.task.title,
        projectId: e.task.projectId,
        dueDate: e.task.dueDate,
      });
    } catch (err: any) {
      this.logger.error(`onTaskOverdue webhook error: ${err.message}`);
    }
  }

  @OnEvent(EVENTS.COMMENT_CREATED)
  async onCommentCreated(e: CommentCreatedEvent) {
    try {
      await this.fireForCompany(e.companyId, EVENTS.COMMENT_CREATED, {
        commentId: e.comment.id,
        taskId: e.task.id,
        taskTitle: e.task.title,
        content: e.comment.content.slice(0, 200),
        actorName: e.actor.name,
        actorEmail: e.actor.email,
      });
    } catch (err: any) {
      this.logger.error(`onCommentCreated webhook error: ${err.message}`);
    }
  }

  @OnEvent('process.completed')
  async onProcessCompleted(e: ProcessCompletedEvent) {
    try {
      await this.fireForCompany(e.companyId, 'process.completed', {
        processId: e.processId,
        processName: e.processName,
        instanceId: e.instanceId,
      });
    } catch (err: any) {
      this.logger.error(`onProcessCompleted webhook error: ${err.message}`);
    }
  }

  // ── Core delivery logic ───────────────────────────────────────────────────

  private async fireForCompany(companyId: string, event: string, data: Record<string, any>) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { companyId, isActive: true },
    });

    const matching = webhooks.filter((w) => w.events.includes(event) || w.events.includes('*'));

    this.logger.debug(`[${event}] companyId=${companyId} | webhooks ativos=${webhooks.length} | matching=${matching.length}`);

    if (matching.length === 0) return;

    const payload = { event, timestamp: new Date().toISOString(), companyId, data };

    await Promise.allSettled(
      matching.map((w) =>
        this.webhookQueue.add('deliver', {
          webhookId: w.id,
          url: w.url,
          secret: w.secret,
          event,
          payload: payload as Record<string, unknown>,
        }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 50 }),
      ),
    );
  }

  async test(id: string) {
    const webhook = await this.prisma.webhook.findUnique({ where: { id } });
    if (!webhook) return { success: false, error: 'Webhook não encontrado' };
    const payload = { event: 'webhook.test', timestamp: new Date().toISOString(), data: { message: 'Teste do Agilis.' } };
    await this.webhookQueue.add('deliver', {
      webhookId: webhook.id, url: webhook.url, secret: webhook.secret,
      event: 'webhook.test', payload: payload as Record<string, unknown>,
    }, { attempts: 1, removeOnComplete: 10, removeOnFail: 10 });
    return { success: true, queued: true };
  }
}
