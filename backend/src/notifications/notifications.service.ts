import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  // SSE stream: um Subject global, filtramos por userId no subscribe
  private readonly stream$ = new Subject<{ userId: string; data: any }>();

  constructor(private readonly prisma: PrismaService) {}

  // ── SSE ──────────────────────────────────────────────────────────────────

  getStream(userId: string): Observable<MessageEvent> {
    return new Observable<MessageEvent>((observer) => {
      const sub = this.stream$
        .pipe(filter((e) => e.userId === userId))
        .subscribe({
          next: (e) => observer.next({ data: JSON.stringify(e.data) } as MessageEvent),
          error: (err) => observer.error(err),
        });

      return () => sub.unsubscribe();
    });
  }

  // ── Criação ───────────────────────────────────────────────────────────────

  async create(payload: NotificationPayload) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        content: payload.content,
        entityType: payload.entityType,
        entityId: payload.entityId,
        metadata: payload.metadata,
      },
    });

    // push via SSE
    this.stream$.next({ userId: payload.userId, data: notification });

    return notification;
  }

  async createMany(payloads: NotificationPayload[]) {
    return Promise.all(payloads.map((p) => this.create(p)));
  }

  // ── Leitura ───────────────────────────────────────────────────────────────

  async findAll(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { items, total, unread, page, limit };
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async deleteOld(userId: string) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    return this.prisma.notification.deleteMany({
      where: { userId, createdAt: { lt: cutoff }, isRead: true },
    });
  }

  // ── Helpers de notificação por evento ────────────────────────────────────

  async notifyTaskAssigned(taskId: string, assigneeId: string, assignerName: string, taskTitle: string) {
    return this.create({
      userId: assigneeId,
      type: NotificationType.TASK_ASSIGNED,
      title: 'Nova tarefa atribuída',
      content: `${assignerName} atribuiu a tarefa "${taskTitle}" a você`,
      entityType: 'task',
      entityId: taskId,
    });
  }

  async notifyComment(taskId: string, recipientId: string, commenterName: string, taskTitle: string) {
    return this.create({
      userId: recipientId,
      type: NotificationType.TASK_COMMENTED,
      title: 'Novo comentário',
      content: `${commenterName} comentou na tarefa "${taskTitle}"`,
      entityType: 'task',
      entityId: taskId,
    });
  }

  async notifyMention(taskId: string, mentionedId: string, mentionerName: string, taskTitle: string) {
    return this.create({
      userId: mentionedId,
      type: NotificationType.TASK_MENTIONED,
      title: 'Você foi mencionado',
      content: `${mentionerName} mencionou você na tarefa "${taskTitle}"`,
      entityType: 'task',
      entityId: taskId,
    });
  }
}
