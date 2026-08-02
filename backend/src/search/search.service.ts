import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(q: string, companyId: string) {
    if (!q || q.trim().length < 2) return { tasks: [], projects: [], members: [], wikiPages: [], corpWiki: [] };

    const contains = q.trim();
    const mode = 'insensitive' as const;

    const [tasks, projects, members, wikiPages, corpWiki] = await Promise.all([
      this.prisma.task.findMany({
        where: { project: { companyId }, title: { contains, mode } },
        select: {
          id: true, title: true, status: true, priority: true,
          project: { select: { id: true, name: true, color: true } },
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.project.findMany({
        where: { companyId, name: { contains, mode }, isArchived: false },
        select: { id: true, name: true, color: true, icon: true, description: true },
        take: 5,
      }),
      this.prisma.userCompany.findMany({
        where: { companyId, user: { name: { contains, mode } } },
        select: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        take: 5,
      }),
      this.prisma.wikiPage.findMany({
        where: { project: { companyId }, title: { contains, mode } },
        select: {
          id: true, title: true, icon: true,
          project: { select: { id: true, name: true } },
        },
        take: 5,
      }),
      this.prisma.corporateWikiPage.findMany({
        where: { companyId, title: { contains, mode } },
        select: { id: true, title: true, icon: true },
        take: 5,
      }),
    ]);

    return {
      tasks,
      projects,
      members: members.map((m) => m.user),
      wikiPages,
      corpWiki,
    };
  }
}
