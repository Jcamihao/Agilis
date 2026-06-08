import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

// Extrai @menções do conteúdo: retorna lista de nomes em lowercase
const extractMentions = (content: string): string[] => {
  const matches = content.match(/@([a-zA-ZÀ-ú0-9._-]+)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
};

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findByTask(taskId: string, userId: string) {
    await this.checkTaskAccess(taskId, userId);

    return this.prisma.comment.findMany({
      where: { taskId },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        mentions: { include: { mentioned: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(dto: CreateCommentDto, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: dto.taskId },
      include: {
        project: true,
        assignee: { select: { id: true, name: true } },
        creator:  { select: { id: true, name: true } },
      },
    });

    if (!task) throw new NotFoundException('Tarefa não encontrada');
    await this.checkCompanyAccess(task.project.companyId, userId);

    const author = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    // Resolve menções: busca por nome parcial (case-insensitive)
    const mentionNames = extractMentions(dto.content);
    const mentionedUsers = mentionNames.length > 0
      ? await this.prisma.user.findMany({
          where: {
            name: { in: mentionNames, mode: 'insensitive' },
            companies: { some: { companyId: task.project.companyId } },
          },
          select: { id: true, name: true },
        })
      : [];

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content,
        taskId: dto.taskId,
        authorId: userId,
        mentions: mentionedUsers.length > 0 ? {
          create: mentionedUsers.map((u) => ({ mentionedId: u.id })),
        } : undefined,
      },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true } },
        mentions: { include: { mentioned: { select: { id: true, name: true } } } },
      },
    });

    // Notificar assignee (se diferente do autor)
    const recipientIds = new Set<string>();

    if (task.assigneeId && task.assigneeId !== userId) {
      recipientIds.add(task.assigneeId);
    }
    if (task.creatorId && task.creatorId !== userId) {
      recipientIds.add(task.creatorId);
    }

    for (const recipientId of recipientIds) {
      await this.notifications.notifyComment(task.id, recipientId, author.name, task.title);
    }

    // Notificar menções
    for (const mentioned of mentionedUsers) {
      if (mentioned.id !== userId) {
        await this.notifications.notifyMention(task.id, mentioned.id, author.name, task.title);
      }
    }

    // Registrar atividade
    await this.prisma.activity.create({
      data: {
        action: 'comment_added',
        entityType: 'comment',
        entityId: comment.id,
        taskId: task.id,
        userId,
        metadata: { commentId: comment.id },
      },
    }).catch(() => {});

    return comment;
  }

  async update(id: string, dto: UpdateCommentDto, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comentário não encontrado');
    if (comment.authorId !== userId) throw new ForbiddenException('Somente o autor pode editar');

    return this.prisma.comment.update({
      where: { id },
      data: { content: dto.content, isEdited: true },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async delete(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { task: { include: { project: true } } },
    });

    if (!comment) throw new NotFoundException('Comentário não encontrado');

    const isAuthor = comment.authorId === userId;
    const isAdmin = await this.prisma.userCompany.findFirst({
      where: { userId, companyId: comment.task.project.companyId, role: { in: ['OWNER', 'ADMIN'] } },
    });

    if (!isAuthor && !isAdmin) throw new ForbiddenException('Sem permissão para excluir');

    return this.prisma.comment.delete({ where: { id } });
  }

  private async checkTaskAccess(taskId: string, userId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    await this.checkCompanyAccess(task.project.companyId, userId);
  }

  private async checkCompanyAccess(companyId: string, userId: string) {
    const m = await this.prisma.userCompany.findFirst({ where: { companyId, userId } });
    if (!m) throw new ForbiddenException('Sem acesso');
  }
}
