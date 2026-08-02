import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const AUTHOR_SELECT = { id: true, name: true, avatarUrl: true };
const REACTIONS_SELECT = { id: true, emoji: true, userId: true };
const COMMENTS_SELECT = {
  id: true, content: true, createdAt: true,
  author: { select: AUTHOR_SELECT },
};

@Injectable()
export class FeedService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = { companyId };
    const [posts, total] = await Promise.all([
      this.prisma.feedPost.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          author: { select: AUTHOR_SELECT },
          reactions: { select: REACTIONS_SELECT },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: { author: { select: AUTHOR_SELECT } },
          },
          _count: { select: { reactions: true, comments: true } },
        },
      }),
      this.prisma.feedPost.count({ where }),
    ]);
    return { posts, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(companyId: string, authorId: string, dto: { content: string; imageUrl?: string; isPinned?: boolean }) {
    return this.prisma.feedPost.create({
      data: { companyId, authorId, content: dto.content, imageUrl: dto.imageUrl, isPinned: dto.isPinned ?? false },
      include: {
        author: { select: AUTHOR_SELECT },
        reactions: { select: REACTIONS_SELECT },
        comments: { include: { author: { select: AUTHOR_SELECT } } },
        _count: { select: { reactions: true, comments: true } },
      },
    });
  }

  async update(id: string, userId: string, dto: { content?: string; isPinned?: boolean }) {
    const post = await this.prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post não encontrado');
    if (post.authorId !== userId) throw new ForbiddenException('Sem permissão');
    return this.prisma.feedPost.update({ where: { id }, data: dto });
  }

  async delete(id: string, userId: string) {
    const post = await this.prisma.feedPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post não encontrado');
    if (post.authorId !== userId) throw new ForbiddenException('Sem permissão');
    return this.prisma.feedPost.delete({ where: { id } });
  }

  async react(postId: string, userId: string, emoji: string) {
    const existing = await this.prisma.feedReaction.findUnique({
      where: { postId_userId_emoji: { postId, userId, emoji } },
    });
    if (existing) {
      await this.prisma.feedReaction.delete({ where: { id: existing.id } });
      return { toggled: false };
    }
    await this.prisma.feedReaction.create({ data: { postId, userId, emoji } });
    return { toggled: true };
  }

  async comment(postId: string, authorId: string, content: string) {
    return this.prisma.feedComment.create({
      data: { postId, authorId, content },
      include: { author: { select: AUTHOR_SELECT } },
    });
  }

  async deleteComment(commentId: string, userId: string) {
    const c = await this.prisma.feedComment.findUnique({ where: { id: commentId } });
    if (!c) throw new NotFoundException('Comentário não encontrado');
    if (c.authorId !== userId) throw new ForbiddenException('Sem permissão');
    return this.prisma.feedComment.delete({ where: { id: commentId } });
  }
}
