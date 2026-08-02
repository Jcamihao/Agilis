import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { EVENTS } from '../events/agilis-events';

@Injectable()
export class NotificationListenerService {
  private readonly log = new Logger(NotificationListenerService.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Tarefa criada com assignee ──────────────────────────────────────────
  @OnEvent(EVENTS.TASK_CREATED)
  async onTaskCreated(payload: any) {
    const { task, actor, companyId } = payload;
    if (!task.assigneeId || task.assigneeId === actor.id) return;

    await this.notifications.create({
      userId:     task.assigneeId,
      type:       'TASK_ASSIGNED',
      title:      'Tarefa atribuída a você',
      content:    `${actor.name} atribuiu "${task.title}" para você`,
      entityType: 'task',
      entityId:   task.id,
    });

    const assignee = await this.prisma.user.findUnique({
      where: { id: task.assigneeId }, select: { email: true, name: true },
    });
    if (assignee) {
      this.mail.send({
        to:      assignee.email,
        subject: `Agilis — Tarefa atribuída: ${task.title}`,
        html:    this.tplAssigned(assignee.name, task.title, actor.name),
      }).catch(e => this.log.warn(`Mail failed: ${e.message}`));
    }
  }

  // ── Tarefa reatribuída ─────────────────────────────────────────────────
  @OnEvent(EVENTS.TASK_ASSIGNED)
  async onTaskAssigned(payload: any) {
    const { task, assigneeId, actor, companyId } = payload;
    if (!assigneeId || assigneeId === actor.id) return;

    await this.notifications.create({
      userId:     assigneeId,
      type:       'TASK_ASSIGNED',
      title:      'Tarefa atribuída a você',
      content:    `${actor.name} atribuiu "${task.title}" para você`,
      entityType: 'task',
      entityId:   task.id,
    });

    const assignee = await this.prisma.user.findUnique({
      where: { id: assigneeId }, select: { email: true, name: true },
    });
    if (assignee) {
      this.mail.send({
        to:      assignee.email,
        subject: `Agilis — Tarefa atribuída: ${task.title}`,
        html:    this.tplAssigned(assignee.name, task.title, actor.name),
      }).catch(e => this.log.warn(`Mail failed: ${e.message}`));
    }
  }

  // ── Status alterado ────────────────────────────────────────────────────
  @OnEvent(EVENTS.TASK_STATUS_CHANGED)
  async onStatusChanged(payload: any) {
    const { task, oldStatus, newStatus, actor } = payload;
    const toNotify = new Set<string>();

    if (task.assigneeId && task.assigneeId !== actor.id) toNotify.add(task.assigneeId);
    if (task.creatorId  && task.creatorId  !== actor.id) toNotify.add(task.creatorId);

    for (const userId of toNotify) {
      await this.notifications.create({
        userId,
        type:       'TASK_STATUS_CHANGED',
        title:      'Status de tarefa alterado',
        content:    `${actor.name} moveu "${task.title}" para ${this.statusLabel(newStatus)}`,
        entityType: 'task',
        entityId:   task.id,
        metadata:   { oldStatus, newStatus },
      });
    }
  }

  // ── Comentário criado ──────────────────────────────────────────────────
  @OnEvent(EVENTS.COMMENT_CREATED)
  async onCommentCreated(payload: any) {
    const { comment, task, actor } = payload;
    const toNotify = new Set<string>();

    if (task.assigneeId && task.assigneeId !== actor.id) toNotify.add(task.assigneeId);
    if (task.creatorId  && task.creatorId  !== actor.id) toNotify.add(task.creatorId);

    for (const userId of toNotify) {
      await this.notifications.create({
        userId,
        type:       'TASK_COMMENTED',
        title:      'Novo comentário na tarefa',
        content:    `${actor.name} comentou em "${task.title}"`,
        entityType: 'task',
        entityId:   task.id,
      });
    }
  }

  // ── Membro adicionado ao projeto ───────────────────────────────────────
  @OnEvent(EVENTS.PROJECT_MEMBER_ADDED)
  async onProjectMemberAdded(payload: any) {
    const { project, targetUserId, actor } = payload;
    if (targetUserId === actor.id) return;

    await this.notifications.create({
      userId:     targetUserId,
      type:       'PROJECT_INVITE',
      title:      'Você foi adicionado a um projeto',
      content:    `${actor.name} te adicionou ao projeto "${project.name}"`,
      entityType: 'project',
      entityId:   project.id,
    });

    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId }, select: { email: true, name: true },
    });
    if (user) {
      this.mail.send({
        to:      user.email,
        subject: `Agilis — Você foi adicionado ao projeto ${project.name}`,
        html:    this.tplProjectInvite(user.name, project.name, actor.name),
      }).catch(e => this.log.warn(`Mail failed: ${e.message}`));
    }
  }

  // ── Tarefa vencendo em breve ───────────────────────────────────────────
  @OnEvent(EVENTS.TASK_DUE_SOON)
  async onTaskDueSoon(payload: any) {
    const { task } = payload;
    if (!task.assigneeId) return;

    await this.notifications.create({
      userId:     task.assigneeId,
      type:       'TASK_DUE_SOON',
      title:      'Tarefa vence em breve',
      content:    `"${task.title}" vence ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : 'hoje'}`,
      entityType: 'task',
      entityId:   task.id,
    });
  }

  // ── Tarefa vencida ─────────────────────────────────────────────────────
  @OnEvent(EVENTS.TASK_OVERDUE)
  async onTaskOverdue(payload: any) {
    const { task } = payload;
    if (!task.assigneeId) return;

    await this.notifications.create({
      userId:     task.assigneeId,
      type:       'TASK_OVERDUE',
      title:      'Tarefa em atraso',
      content:    `"${task.title}" está atrasada`,
      entityType: 'task',
      entityId:   task.id,
    });

    const assignee = await this.prisma.user.findUnique({
      where: { id: task.assigneeId }, select: { email: true, name: true },
    });
    if (assignee) {
      this.mail.send({
        to:      assignee.email,
        subject: `Agilis — ⚠️ Tarefa em atraso: ${task.title}`,
        html:    this.tplOverdue(assignee.name, task.title),
      }).catch(e => this.log.warn(`Mail failed: ${e.message}`));
    }
  }

  // ── Templates de e-mail ────────────────────────────────────────────────
  private tplAssigned(name: string, taskTitle: string, by: string) {
    return `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <div style="background:#4648d4;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">Agilis</h2>
        </div>
        <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p>Olá, <strong>${name}</strong>!</p>
          <p><strong>${by}</strong> atribuiu a tarefa <strong>"${taskTitle}"</strong> para você.</p>
          <p style="color:#64748b;font-size:.85em">Acesse o Agilis para ver os detalhes.</p>
        </div>
      </div>`;
  }

  private tplProjectInvite(name: string, projectName: string, by: string) {
    return `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <div style="background:#4648d4;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">Agilis</h2>
        </div>
        <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p>Olá, <strong>${name}</strong>!</p>
          <p><strong>${by}</strong> te adicionou ao projeto <strong>"${projectName}"</strong>.</p>
          <p style="color:#64748b;font-size:.85em">Acesse o Agilis para colaborar.</p>
        </div>
      </div>`;
  }

  private tplOverdue(name: string, taskTitle: string) {
    return `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto">
        <div style="background:#ef4444;padding:20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0">Agilis — ⚠️ Tarefa em atraso</h2>
        </div>
        <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p>Olá, <strong>${name}</strong>!</p>
          <p>A tarefa <strong>"${taskTitle}"</strong> está em atraso.</p>
          <p style="color:#64748b;font-size:.85em">Acesse o Agilis para atualizar o status.</p>
        </div>
      </div>`;
  }

  private statusLabel(s: string) {
    const map: Record<string, string> = {
      BACKLOG: 'Backlog', IN_PROGRESS: 'Em andamento',
      IN_REVIEW: 'Em revisão', DONE: 'Concluído',
    };
    return map[s] ?? s;
  }
}
