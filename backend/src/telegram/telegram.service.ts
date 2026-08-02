import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  EVENTS,
  TaskCreatedEvent,
  TaskAssignedEvent,
  TaskOverdueEvent,
} from '../events/agilis-events';

type TelegramPref = { taskCreated?: boolean; taskAssigned?: boolean; taskDueSoon?: boolean };

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly token: string;
  private readonly apiBase: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.token   = this.config.get<string>('TELEGRAM_BOT_TOKEN') ?? '';
    this.apiBase = `https://api.telegram.org/bot${this.token}`;

    if (this.token) {
      this.logger.log('Telegram Bot configurado.');
    } else {
      this.logger.warn('TELEGRAM_BOT_TOKEN não definido — notificações Telegram desativadas.');
    }
  }

  // ── Envio ─────────────────────────────────────────────────────────────────

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.token) return false;

    try {
      const res = await fetch(`${this.apiBase}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Telegram sendMessage failed (${res.status}): ${body}`);
        return false;
      }
      return true;
    } catch (err: any) {
      this.logger.error(`Telegram fetch error: ${err.message}`);
      return false;
    }
  }

  // ── Auto-detecção de chat ID ──────────────────────────────────────────────

  async getRecentUpdates(): Promise<{ chatId: string; name: string; username?: string }[]> {
    if (!this.token) return [];

    try {
      const res  = await fetch(`${this.apiBase}/getUpdates?limit=20`);
      const data = await res.json() as any;
      if (!data.ok) return [];

      const seen = new Set<string>();
      const result: { chatId: string; name: string; username?: string }[] = [];

      for (const update of data.result ?? []) {
        const chat = update.message?.chat ?? update.callback_query?.message?.chat;
        if (!chat) continue;
        const id = String(chat.id);
        if (seen.has(id)) continue;
        seen.add(id);
        result.push({
          chatId: id,
          name: [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.title || id,
          username: chat.username,
        });
      }
      return result;
    } catch (err: any) {
      this.logger.error(`getRecentUpdates error: ${err.message}`);
      return [];
    }
  }

  // ── Event Listeners ───────────────────────────────────────────────────────

  @OnEvent(EVENTS.TASK_CREATED)
  async onTaskCreated(e: TaskCreatedEvent) {
    if (!this.token) return;

    try {
      const chatIds = await this.getChatIdsForUsers([e.actor.id], 'taskCreated');
      if (!chatIds.length) return;

      const priority: Record<string, string> = {
        LOW: '🟢 Baixa', MEDIUM: '🟡 Média', HIGH: '🔴 Alta', CRITICAL: '🚨 Crítica',
      };
      const due = e.task.dueDate
        ? `\n📅 Vence em: ${new Date(e.task.dueDate).toLocaleDateString('pt-BR')}`
        : '';

      const text = [
        `🆕 <b>Nova tarefa criada no Agilis</b>`,
        ``,
        `📌 <b>${e.task.title}</b>`,
        `👤 Criada por: ${e.actor.name}`,
        `⚡ Prioridade: ${priority[e.task.priority] ?? e.task.priority}${due}`,
      ].join('\n');

      await Promise.allSettled(chatIds.map(id => this.sendMessage(id, text)));
    } catch (err: any) {
      this.logger.error(`onTaskCreated Telegram error: ${err.message}`);
    }
  }

  @OnEvent(EVENTS.TASK_ASSIGNED)
  async onTaskAssigned(e: TaskAssignedEvent) {
    if (!this.token) return;

    try {
      const chatIds = await this.getChatIdsForUsers([e.assigneeId], 'taskAssigned');
      if (!chatIds.length) return;

      const text = [
        `📋 <b>Tarefa atribuída a você no Agilis</b>`,
        ``,
        `📌 <b>${e.task.title}</b>`,
        `👤 Atribuída por: ${e.actor.name}`,
      ].join('\n');

      await Promise.allSettled(chatIds.map(id => this.sendMessage(id, text)));
    } catch (err: any) {
      this.logger.error(`onTaskAssigned Telegram error: ${err.message}`);
    }
  }

  @OnEvent(EVENTS.TASK_DUE_SOON)
  async onTaskDueSoon(e: TaskOverdueEvent) {
    if (!this.token) return;

    try {
      const assigneeId = (e.task as any).assigneeId as string | undefined;
      if (!assigneeId) return;

      const chatIds = await this.getChatIdsForUsers([assigneeId], 'taskDueSoon');
      if (!chatIds.length) return;

      const text = [
        `⏰ <b>Tarefa vence em breve no Agilis</b>`,
        ``,
        `📌 <b>${e.task.title}</b>`,
        `📅 Prazo: ${new Date((e.task as any).dueDate).toLocaleDateString('pt-BR')}`,
      ].join('\n');

      await Promise.allSettled(chatIds.map(id => this.sendMessage(id, text)));
    } catch (err: any) {
      this.logger.error(`onTaskDueSoon Telegram error: ${err.message}`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async getChatIdsForUsers(userIds: string[], eventKey: keyof TelegramPref): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds }, telegramChatId: { not: null } },
      select: { telegramChatId: true, notifPreferences: true },
    });

    return users
      .filter(u => {
        const prefs = (u.notifPreferences as any)?.telegram as TelegramPref | undefined;
        // default true if no preference saved
        return prefs?.[eventKey] !== false;
      })
      .map(u => u.telegramChatId!)
      .filter(Boolean);
  }
}
