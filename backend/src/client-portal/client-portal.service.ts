import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

export class UpdatePortalDto {
  isEnabled?: boolean;
  title?: string;
  logoUrl?: string;
  accentColor?: string;
  showKanban?: boolean;
  showTimeline?: boolean;
  showHealth?: boolean;
  showTeam?: boolean;
  password?: string | null;
}

function generateToken(): string {
  return randomBytes(16).toString('hex');
}

@Injectable()
export class ClientPortalService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Authenticated management ───────────────────────────────────────────────

  async getOrCreate(projectId: string) {
    const existing = await this.prisma.clientPortal.findUnique({ where: { projectId } });
    if (existing) return existing;
    return this.prisma.clientPortal.create({
      data: { projectId, token: generateToken() },
    });
  }

  async update(projectId: string, dto: UpdatePortalDto) {
    await this.getOrCreate(projectId);
    return this.prisma.clientPortal.update({
      where: { projectId },
      data:  dto as any,
    });
  }

  async regenerateToken(projectId: string) {
    await this.getOrCreate(projectId);
    return this.prisma.clientPortal.update({
      where: { projectId },
      data:  { token: generateToken() },
    });
  }

  // ── Public portal ──────────────────────────────────────────────────────────

  async getPublicPortal(token: string, password?: string) {
    const portal = await this.prisma.clientPortal.findUnique({
      where:   { token },
      include: { project: { select: { id: true, name: true, description: true, color: true, icon: true, createdAt: true } } },
    });

    if (!portal || !portal.isEnabled) throw new NotFoundException('Portal não encontrado ou desativado');

    if (portal.password && portal.password !== password) {
      throw new UnauthorizedException('Senha incorreta');
    }

    const projectId = portal.projectId;

    // Task stats
    const [allTasks, members] = await Promise.all([
      this.prisma.task.findMany({
        where: { projectId, parentId: null },
        select: {
          id: true, title: true, status: true, priority: true,
          dueDate: true, position: true,
          assignee: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: [{ status: 'asc' }, { position: 'asc' }],
        take: 200,
      }),
      portal.showTeam
        ? this.prisma.projectMember.findMany({
            where: { projectId },
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          })
        : Promise.resolve([]),
    ]);

    // Stats
    const total    = allTasks.length;
    const done     = allTasks.filter(t => t.status === 'DONE').length;
    const inProgress = allTasks.filter(t => t.status === 'IN_PROGRESS').length;
    const overdue  = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    // Group tasks by status for kanban view
    const statusOrder = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
    const kanban = portal.showKanban
      ? statusOrder.map(s => ({
          status: s,
          tasks:  allTasks.filter(t => t.status === s),
        })).filter(col => col.tasks.length > 0)
      : [];

    // Timeline tasks (with due dates)
    const timeline = portal.showTimeline
      ? allTasks
          .filter(t => t.dueDate)
          .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
          .slice(0, 30)
      : [];

    return {
      portal: {
        title:       portal.title ?? portal.project.name,
        accentColor: portal.accentColor,
        logoUrl:     portal.logoUrl,
        showKanban:  portal.showKanban,
        showTimeline: portal.showTimeline,
        showTeam:    portal.showTeam,
      },
      project: {
        id:          portal.project.id,
        name:        portal.project.name,
        description: portal.project.description,
        color:       portal.project.color,
        icon:        portal.project.icon,
        createdAt:   portal.project.createdAt,
      },
      stats:    { total, done, inProgress, overdue, progress },
      kanban,
      timeline,
      team: members.map(m => m.user),
    };
  }
}
