import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export class CreatePageDto {
  title: string;
  parentId?: string;
  content?: string;
  icon?: string;
}

export class UpdatePageDto {
  title?: string;
  content?: string;
  icon?: string;
  parentId?: string | null;
  position?: number;
}

const PAGE_SELECT = {
  id: true, projectId: true, parentId: true, title: true,
  icon: true, position: true, createdAt: true, updatedAt: true,
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
  updatedBy: { select: { id: true, name: true, avatarUrl: true } },
  _count: { select: { children: true, revisions: true } },
};

@Injectable()
export class WikiService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tree ───────────────────────────────────────────────────────────────────

  async listTree(projectId: string) {
    const pages = await this.prisma.wikiPage.findMany({
      where:   { projectId },
      select:  PAGE_SELECT,
      orderBy: [{ parentId: 'asc' }, { position: 'asc' }],
    });

    // Build tree in memory
    const map = new Map<string | null, any[]>();
    for (const p of pages) {
      const key = p.parentId ?? null;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ ...p, children: [] });
    }

    const attach = (parentId: string | null): any[] => {
      const nodes = map.get(parentId) ?? [];
      return nodes.map(n => ({ ...n, children: attach(n.id) }));
    };

    return attach(null);
  }

  // ── Single page with content ───────────────────────────────────────────────

  async getPage(id: string) {
    const page = await this.prisma.wikiPage.findUnique({
      where:  { id },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        updatedBy: { select: { id: true, name: true, avatarUrl: true } },
        revisions: {
          orderBy: { createdAt: 'desc' },
          take:    10,
          include: { author: { select: { id: true, name: true, avatarUrl: true } } },
        },
      },
    });
    if (!page) throw new NotFoundException('Página não encontrada');
    return page;
  }

  // ── Create ─────────────────────────────────────────────────────────────────

  async createPage(projectId: string, userId: string, dto: CreatePageDto) {
    const max = await this.prisma.wikiPage.aggregate({
      where: { projectId, parentId: dto.parentId ?? null },
      _max:  { position: true },
    });
    return this.prisma.wikiPage.create({
      data: {
        projectId,
        parentId:    dto.parentId ?? null,
        title:       dto.title,
        content:     dto.content ?? '',
        icon:        dto.icon ?? 'article',
        position:    (max._max.position ?? -1) + 1,
        createdById: userId,
        updatedById: userId,
      },
      select: PAGE_SELECT,
    });
  }

  // ── Update (saves revision) ────────────────────────────────────────────────

  async updatePage(id: string, userId: string, dto: UpdatePageDto) {
    const existing = await this.prisma.wikiPage.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException();

    // Save revision when content changes
    if (dto.content !== undefined && dto.content !== existing.content) {
      await this.prisma.wikiPageRevision.create({
        data: {
          pageId:   id,
          content:  existing.content,
          title:    existing.title,
          authorId: userId,
        },
      });
    }

    return this.prisma.wikiPage.update({
      where: { id },
      data: {
        ...(dto.title    !== undefined && { title:    dto.title }),
        ...(dto.content  !== undefined && { content:  dto.content }),
        ...(dto.icon     !== undefined && { icon:     dto.icon }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.position !== undefined && { position: dto.position }),
        updatedById: userId,
      },
      include: {
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        updatedBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  deletePage(id: string) {
    return this.prisma.wikiPage.delete({ where: { id } });
  }

  // ── Reorder siblings ───────────────────────────────────────────────────────

  async reorder(projectId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, i) =>
        this.prisma.wikiPage.update({ where: { id }, data: { position: i } }),
      ),
    );
    return this.listTree(projectId);
  }

  // ── Search ─────────────────────────────────────────────────────────────────

  searchPages(projectId: string, q: string) {
    return this.prisma.wikiPage.findMany({
      where: {
        projectId,
        OR: [
          { title:   { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { ...PAGE_SELECT, content: true },
      take:   20,
    });
  }
}
