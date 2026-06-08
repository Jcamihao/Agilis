import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { EVENTS, TaskCreatedEvent } from '../events/agilis-events';

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

  // ── Event Listener ────────────────────────────────────────────────────────

  @OnEvent(EVENTS.TASK_CREATED)
  async onTaskCreated(e: TaskCreatedEvent) {
    if (!this.token) return;

    try {
      const recipients = await this.resolveRecipients(e);
      if (recipients.length === 0) return;

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

      await Promise.allSettled(recipients.map((chatId) => this.sendMessage(chatId, text)));
    } catch (err: any) {
      this.logger.error(`onTaskCreated Telegram error: ${err.message}`);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async resolveRecipients(e: TaskCreatedEvent): Promise<string[]> {
    const chatIds = new Set<string>();

    // Criador da tarefa
    const actor = await this.prisma.user.findUnique({
      where: { id: e.actor.id },
      select: { telegramChatId: true },
    });
    if (actor?.telegramChatId) chatIds.add(actor.telegramChatId);

    // Líder(es) da equipe do projeto
    const project = await this.prisma.project.findUnique({
      where: { id: e.task.projectId },
      select: { teamId: true },
    });

    if (project?.teamId) {
      const leaders = await this.prisma.teamMember.findMany({
        where: { teamId: project.teamId, role: { in: ['OWNER', 'ADMIN'] } },
        include: { user: { select: { telegramChatId: true } } },
      });
      for (const l of leaders) {
        if (l.user.telegramChatId) chatIds.add(l.user.telegramChatId);
      }
    }

    return Array.from(chatIds);
  }
}
