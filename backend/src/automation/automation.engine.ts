import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AutomationTrigger, TaskStatus } from '@prisma/client';
import {
  EVENTS,
  TaskCreatedEvent,
  TaskStatusChangedEvent,
  TaskOverdueEvent,
  CommentCreatedEvent,
  TaskAssignedEvent,
} from '../events/agilis-events';
import { AutomationActionType } from './enum/automation-action-type.enum';
import { TelegramService } from '../telegram/telegram.service';
import { MailService } from '../mail/mail.service';

interface Condition {
  field: string;
  operator: string;
  value: any;
}
interface Action {
  type: AutomationActionType;
  params: Record<string, any>;
}

@Injectable()
export class AutomationEngine {
  private readonly logger = new Logger(AutomationEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly telegram: TelegramService,
    private readonly mail: MailService,
  ) {}

  // ── Event listeners ────────────────────────────────────────────────────────

  @OnEvent(EVENTS.TASK_CREATED)
  async onTaskCreated(event: TaskCreatedEvent) {
    await this.run(
      AutomationTrigger.TASK_CREATED,
      event.companyId,
      event.task,
      event,
    );
  }

  @OnEvent(EVENTS.TASK_STATUS_CHANGED)
  async onStatusChanged(event: TaskStatusChangedEvent) {
    await this.run(
      AutomationTrigger.TASK_STATUS_CHANGED,
      event.companyId,
      event.task,
      event,
    );
  }

  @OnEvent(EVENTS.TASK_OVERDUE)
  async onTaskOverdue(event: TaskOverdueEvent) {
    await this.run(
      AutomationTrigger.TASK_OVERDUE,
      event.companyId,
      event.task,
      event,
    );
  }

  @OnEvent(EVENTS.COMMENT_CREATED)
  async onCommentCreated(event: CommentCreatedEvent) {
    await this.run(
      AutomationTrigger.COMMENT_CREATED,
      event.companyId,
      event.task,
      event,
    );
  }

  @OnEvent(EVENTS.TASK_ASSIGNED)
  async onTaskAssigned(event: TaskAssignedEvent) {
    await this.run(
      AutomationTrigger.TASK_ASSIGNED,
      event.companyId,
      event.task,
      event,
    );
  }

  // ── Core engine ────────────────────────────────────────────────────────────

  private async run(
    trigger: AutomationTrigger,
    companyId: string,
    task: any,
    event: any,
  ) {
    const rules = await this.prisma.automationRule.findMany({
      where: {
        trigger,
        companyId,
        isActive: true,
        OR: [{ projectId: null }, { projectId: task?.projectId ?? '' }],
      },
    });

    for (const rule of rules) {
      const started = Date.now();
      let executionId: string | null = null;

      try {
        executionId = (
          await this.prisma.automationExecution.create({
            data: { ruleId: rule.id, taskId: task?.id, status: 'RUNNING' },
          })
        ).id;

        const conditions = rule.conditions as unknown as Condition[];
        const passes = this.evaluateConditions(conditions, task, event);

        if (!passes) {
          await this.prisma.automationExecution.update({
            where: { id: executionId },
            data: { status: 'SKIPPED', durationMs: Date.now() - started },
          });
          continue;
        }

        const actions = rule.actions as unknown as Action[];
        const results: any[] = [];

        for (const action of actions) {
          const result = await this.executeAction(
            action,
            task,
            event,
            companyId,
          );
          results.push(result);
        }

        await this.prisma.automationRule.update({
          where: { id: rule.id },
          data: { runCount: { increment: 1 }, lastRunAt: new Date() },
        });

        await this.prisma.automationExecution.update({
          where: { id: executionId },
          data: {
            status: 'SUCCESS',
            result: results,
            durationMs: Date.now() - started,
          },
        });

        const skipped = results.filter((r) => r?.skipped);
        if (skipped.length) {
          this.logger.warn(
            `Automation "${rule.name}" executed but some actions were skipped: ${JSON.stringify(skipped)}`,
          );
        } else {
          this.logger.log(
            `Automation "${rule.name}" executed successfully on task ${task?.id}`,
          );
        }
      } catch (err: any) {
        this.logger.error(`Automation "${rule.name}" failed: ${err.message}`);
        if (executionId) {
          await this.prisma.automationExecution
            .update({
              where: { id: executionId },
              data: {
                status: 'FAILED',
                error: err.message,
                durationMs: Date.now() - started,
              },
            })
            .catch(() => {});
        }
      }
    }
  }

  // ── Condition evaluator ────────────────────────────────────────────────────

  private evaluateConditions(
    conditions: Condition[],
    task: any,
    event: any,
  ): boolean {
    if (!conditions?.length) return true;

    return conditions.every((cond) => {
      const value = this.resolveField(cond.field, task, event);
      return this.compare(value, cond.operator, cond.value);
    });
  }

  private resolveField(field: string, task: any, event: any): any {
    if (field.startsWith('event.')) return event?.[field.slice(6)];
    return task?.[field];
  }

  private compare(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'equals':
        return String(actual) === String(expected);
      case 'not_equals':
        return String(actual) !== String(expected);
      case 'contains':
        return String(actual)
          .toLowerCase()
          .includes(String(expected).toLowerCase());
      case 'in':
        return (expected as string[]).includes(String(actual));
      case 'not_in':
        return !(expected as string[]).includes(String(actual));
      case 'is_set':
        return actual != null && actual !== '';
      case 'is_not_set':
        return actual == null || actual === '';
      default:
        return false;
    }
  }

  // ── Action executor ────────────────────────────────────────────────────────

  private async executeAction(
    action: Action,
    task: any,
    event: any,
    companyId: string,
  ) {
    switch (action.type) {
      case AutomationActionType.CHANGE_STATUS:
        return this.actionChangeStatus(
          task,
          action.params.status as TaskStatus,
        );

      case AutomationActionType.ASSIGN_USER:
        return this.actionAssignUser(task, action.params.userId);

      case AutomationActionType.SEND_NOTIFICATION:
        return this.actionSendNotification(
          task,
          action.params,
          companyId,
          event?.actor,
        );

      case AutomationActionType.CREATE_TASK:
        return this.actionCreateTask(
          task,
          action.params,
          companyId,
          event?.actor,
        );

      case AutomationActionType.SEND_EMAIL:
        return this.actionSendEmail(task, action.params, event?.actor);

      case AutomationActionType.SEND_WHATSAPP:
        return { skipped: true, reason: 'WhatsApp integration removed' };

      case AutomationActionType.SEND_TELEGRAM:
        return this.actionSendTelegram(task, action.params, event);

      default:
        return { skipped: true, reason: `Unknown action: ${action.type}` };
    }
  }

  private async actionChangeStatus(task: any, status: TaskStatus) {
    if (!task?.id) return { skipped: true };
    await this.prisma.task.update({ where: { id: task.id }, data: { status } });
    return { type: 'CHANGE_STATUS', newStatus: status };
  }

  private async actionAssignUser(task: any, userId: string) {
    if (!task?.id || !userId) return { skipped: true };
    await this.prisma.task.update({
      where: { id: task.id },
      data: { assigneeId: userId },
    });
    return { type: 'ASSIGN_USER', userId };
  }

  private async actionSendNotification(
    task: any,
    params: any,
    companyId: string,
    actor: any,
  ) {
    if (!task?.id) return { skipped: true };

    // Notify all company members or specific user
    const recipients = params.userId
      ? [params.userId]
      : (
          await this.prisma.userCompany.findMany({
            where: { companyId },
            select: { userId: true },
          })
        ).map((m) => m.userId);

    for (const userId of recipients) {
      await this.notifications.create({
        userId,
        type: 'AUTOMATION_TRIGGERED',
        title: params.title ?? 'Automação ativada',
        content:
          params.message ?? `Automação executada na tarefa "${task.title}"`,
        entityType: 'task',
        entityId: task.id,
        metadata: { automated: true },
      });
    }
    return { type: 'SEND_NOTIFICATION', recipientCount: recipients.length };
  }

  private async actionCreateTask(
    task: any,
    params: any,
    companyId: string,
    actor: any,
  ) {
    if (!task?.projectId) return { skipped: true };
    const created = await this.prisma.task.create({
      data: {
        title: params.title ?? `Tarefa gerada por automação`,
        description: params.description,
        status: params.status ?? 'BACKLOG',
        priority: params.priority ?? 'MEDIUM',
        projectId: task.projectId,
        creatorId: actor?.id ?? task.creatorId,
        position: 0,
      },
    });
    return { type: 'CREATE_TASK', taskId: created.id };
  }

  private async actionSendEmail(task: any, params: any, actor: any) {
    const to = params.to ?? actor?.email;
    if (!to) return { type: 'SEND_EMAIL', skipped: true };

    await this.mail.send({
      to,
      subject: params.subject ?? `[Agilis] Tarefa: ${task?.title}`,
      html: params.body ?? `<p>A automação foi disparada para a tarefa <strong>${task?.title}</strong>.</p>`,
    });

    return { type: 'SEND_EMAIL', to };
  }

  private async actionSendTelegram(task: any, params: any, event: any) {
    const target = params.target ?? 'creator';
    const chatIds = new Set<string>();

    if (target === 'creator' || target === 'both') {
      const creatorId = task?.creatorId ?? event?.actor?.id;
      if (creatorId) {
        const u = await this.prisma.user.findUnique({ where: { id: creatorId }, select: { telegramChatId: true } });
        if (u?.telegramChatId) chatIds.add(u.telegramChatId);
      }
    }

    if (target === 'assignee' || target === 'both') {
      if (task?.assigneeId) {
        const u = await this.prisma.user.findUnique({ where: { id: task.assigneeId }, select: { telegramChatId: true } });
        if (u?.telegramChatId) chatIds.add(u.telegramChatId);
      }
    }

    if (target === 'custom' && params.chatId) {
      chatIds.add(String(params.chatId));
    }

    if (chatIds.size === 0) {
      return { skipped: true, reason: 'Nenhum Telegram Chat ID encontrado para os destinatários' };
    }

    const priority: Record<string, string> = {
      LOW: '🟢 Baixa', MEDIUM: '🟡 Média', HIGH: '🔴 Alta', CRITICAL: '🚨 Crítica',
    };

    const text = params.message
      ? params.message
          .replace('{taskTitle}',  task?.title    ?? '')
          .replace('{priority}',   task?.priority ?? '')
          .replace('{status}',     task?.status   ?? '')
      : [
          `📌 <b>Agilis — Nova tarefa</b>`,
          ``,
          `<b>${task?.title ?? 'Sem título'}</b>`,
          `⚡ Prioridade: ${priority[task?.priority] ?? task?.priority ?? '—'}`,
          event?.actor?.name ? `👤 Criada por: ${event.actor.name}` : '',
        ].filter(Boolean).join('\n');

    let sent = 0;
    for (const chatId of chatIds) {
      const ok = await this.telegram.sendMessage(chatId, text);
      if (ok) sent++;
    }

    return { type: 'SEND_TELEGRAM', sent, total: chatIds.size };
  }

}
