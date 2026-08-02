import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const USER_SELECT = { id: true, name: true, avatarUrl: true };

@Injectable()
export class CorporateWikiService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    return this.prisma.corporateWikiPage.findMany({
      where: { companyId },
      orderBy: [{ parentId: 'asc' }, { position: 'asc' }],
      include: {
        createdBy: { select: USER_SELECT },
        updatedBy: { select: USER_SELECT },
        _count: { select: { children: true, revisions: true } },
      },
    });
  }

  async getOne(id: string) {
    const page = await this.prisma.corporateWikiPage.findUnique({
      where: { id },
      include: {
        createdBy: { select: USER_SELECT },
        updatedBy: { select: USER_SELECT },
        children: { orderBy: { position: 'asc' }, select: { id: true, title: true, icon: true } },
        revisions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { author: { select: USER_SELECT } },
        },
      },
    });
    if (!page) throw new NotFoundException('Página não encontrada');
    return page;
  }

  async create(companyId: string, userId: string, dto: {
    title: string; content?: string; parentId?: string; icon?: string; position?: number;
  }) {
    return this.prisma.corporateWikiPage.create({
      data: {
        companyId,
        createdById: userId,
        updatedById: userId,
        title: dto.title,
        content: dto.content ?? '',
        parentId: dto.parentId ?? null,
        icon: dto.icon ?? 'article',
        position: dto.position ?? 0,
      },
      include: { createdBy: { select: USER_SELECT }, updatedBy: { select: USER_SELECT } },
    });
  }

  async update(id: string, userId: string, dto: {
    title?: string; content?: string; icon?: string; position?: number; parentId?: string;
  }) {
    const page = await this.prisma.corporateWikiPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Página não encontrada');

    if (dto.content !== undefined && dto.content !== page.content) {
      await this.prisma.corporateWikiRevision.create({
        data: { pageId: id, authorId: userId, title: page.title, content: page.content },
      });
    }

    return this.prisma.corporateWikiPage.update({
      where: { id },
      data: { ...dto, updatedById: userId },
      include: { createdBy: { select: USER_SELECT }, updatedBy: { select: USER_SELECT } },
    });
  }

  async delete(id: string) {
    const page = await this.prisma.corporateWikiPage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Página não encontrada');
    return this.prisma.corporateWikiPage.delete({ where: { id } });
  }
}
