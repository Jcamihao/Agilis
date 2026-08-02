import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { EVENTS } from '../events/agilis-events';

const MEMBER_SELECT = {
  id: true,
  projectId: true,
  userId: true,
  role: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async findAll(companyId: string | undefined, userId: string, teamId?: string) {
    let companyIds: string[];

    if (companyId) {
      await this.checkCompanyAccess(companyId, userId);
      companyIds = [companyId];
    } else {
      const memberships = await this.prisma.userCompany.findMany({
        where: { userId },
        select: { companyId: true },
      });
      companyIds = memberships.map((m) => m.companyId);
    }

    return this.prisma.project.findMany({
      where: {
        companyId: { in: companyIds },
        ...(teamId ? { teamId } : {}),
        isArchived: false,
      },
      include: {
        company: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, color: true } },
        teams: { include: { team: { select: { id: true, name: true, color: true } } } },
        members: { take: 6, orderBy: { createdAt: 'asc' }, select: MEMBER_SELECT },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        team: true,
        teams: { include: { team: { select: { id: true, name: true, color: true } } } },
        members: { orderBy: { createdAt: 'asc' }, select: MEMBER_SELECT },
        tasks: {
          include: { assignee: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: [{ status: 'asc' }, { position: 'asc' }],
        },
        _count: { select: { tasks: true, members: true } },
      },
    });

    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.checkCompanyAccess(project.companyId, userId);
    return project;
  }

  async create(dto: CreateProjectDto, userId: string) {
    await this.checkCompanyAccess(dto.companyId, userId);

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        color: dto.color || '#6366f1',
        icon: dto.icon || 'folder',
        companyId: dto.companyId,
        teamId: dto.teamIds?.[0] ?? dto.teamId,
      },
    });

    // Criar links com equipes
    if (dto.teamIds?.length) {
      await this.prisma.projectTeam.createMany({
        data: dto.teamIds.map((tid) => ({ projectId: project.id, teamId: tid })),
        skipDuplicates: true,
      });
    }

    // Criador sempre entra como OWNER
    const memberSet = new Set<string>(dto.memberIds ?? []);
    memberSet.add(userId);

    await this.prisma.projectMember.createMany({
      data: [...memberSet].map((uid) => ({
        projectId: project.id,
        userId: uid,
        role: (uid === userId ? UserRole.OWNER : UserRole.MEMBER),
      })),
      skipDuplicates: true,
    });

    return this.findOne(project.id, userId);
  }

  async update(id: string, dto: Partial<CreateProjectDto>, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.checkCompanyAccess(project.companyId, userId);

    const { memberIds, ...rest } = dto as any;

    await this.prisma.project.update({ where: { id }, data: rest });

    if (memberIds !== undefined) {
      // Substitui membros mantendo o criador/owner
      const owner = await this.prisma.projectMember.findFirst({
        where: { projectId: id, role: 'OWNER' },
      });

      await this.prisma.projectMember.deleteMany({
        where: { projectId: id, role: { not: 'OWNER' } },
      });

      const newIds = (memberIds as string[]).filter((uid) => uid !== owner?.userId);
      if (newIds.length > 0) {
        await this.prisma.projectMember.createMany({
          data: newIds.map((uid) => ({ projectId: id, userId: uid, role: UserRole.MEMBER })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(id, userId);
  }

  async findArchived(companyId: string | undefined, userId: string) {
    let companyIds: string[];

    if (companyId) {
      await this.checkCompanyAccess(companyId, userId);
      companyIds = [companyId];
    } else {
      const memberships = await this.prisma.userCompany.findMany({
        where: { userId },
        select: { companyId: true },
      });
      companyIds = memberships.map((m) => m.companyId);
    }

    return this.prisma.project.findMany({
      where: { companyId: { in: companyIds }, isArchived: true },
      include: {
        company: { select: { id: true, name: true } },
        team: { select: { id: true, name: true, color: true } },
        teams: { include: { team: { select: { id: true, name: true, color: true } } } },
        members: { take: 4, orderBy: { createdAt: 'asc' }, select: MEMBER_SELECT },
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async restore(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.checkCompanyAccess(project.companyId, userId);
    return this.prisma.project.update({ where: { id }, data: { isArchived: false } });
  }

  async addMember(projectId: string, targetUserId: string, role: string, requesterId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.checkCompanyAccess(project.companyId, requesterId);

    await this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      create: { projectId, userId: targetUserId, role: role as any },
      update: { role: role as any },
    });

    const actor = await this.prisma.user.findUnique({ where: { id: requesterId }, select: { id: true, name: true, email: true } });
    this.events.emit(EVENTS.PROJECT_MEMBER_ADDED, { project, targetUserId, actor });

    return this.findOne(projectId, requesterId);
  }

  async removeMember(projectId: string, targetUserId: string, requesterId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.checkCompanyAccess(project.companyId, requesterId);

    await this.prisma.projectMember.deleteMany({
      where: { projectId, userId: targetUserId, role: { not: 'OWNER' } },
    });
    return this.findOne(projectId, requesterId);
  }

  async updateColumnConfig(id: string, config: Record<string, string>, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.checkCompanyAccess(project.companyId, userId);
    return this.prisma.project.update({ where: { id }, data: { columnConfig: config } });
  }

  async archive(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.checkCompanyAccess(project.companyId, userId);

    return this.prisma.project.update({ where: { id }, data: { isArchived: true } });
  }

  async getPortfolio(companyId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    const projects = await this.prisma.project.findMany({
      where: { companyId, isArchived: false },
      include: {
        tasks: { select: { id: true, status: true, dueDate: true, updatedAt: true } },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const [risksByProject, healthScores, objectives] = await Promise.all([
      this.prisma.risk.groupBy({
        by: ['projectId'],
        where: { project: { companyId } },
        _count: { id: true },
      }).catch(() => []),
      this.prisma.healthScore.findMany({
        where: { companyId, entityType: 'PROJECT' },
        orderBy: { calculatedAt: 'desc' },
        select: { entityId: true, score: true },
      }).catch(() => []),
      this.prisma.objective.findMany({
        where: { companyId },
        include: { keyResults: { select: { startValue: true, currentValue: true, targetValue: true } } },
      }).catch(() => []),
    ]);

    const riskMap = Object.fromEntries(risksByProject.map((r: any) => [r.projectId, r._count.id]));
    // Keep only latest score per project
    const seenHealth = new Set<string>();
    const healthMap: Record<string, { score: number; grade: string }> = {};
    for (const h of healthScores as any[]) {
      if (!seenHealth.has(h.entityId)) {
        seenHealth.add(h.entityId);
        const grade = h.score >= 80 ? 'A' : h.score >= 60 ? 'B' : h.score >= 40 ? 'C' : 'D';
        healthMap[h.entityId] = { score: h.score, grade };
      }
    }

    return projects.map((p) => {
      const total     = p.tasks.length;
      const done      = p.tasks.filter((t) => t.status === 'DONE').length;
      const overdue   = p.tasks.filter((t) => t.dueDate && t.dueDate < new Date() && t.status !== 'DONE').length;
      const progress  = total > 0 ? Math.round((done / total) * 100) : 0;

      // Velocity: tasks completed in last 14 days
      const since14  = new Date(Date.now() - 14 * 86_400_000);
      const recentDone = p.tasks.filter((t) => t.status === 'DONE' && t.updatedAt >= since14).length;
      const dailyVelocity = recentDone / 14;

      const remaining = total - done;
      const forecastDays = dailyVelocity > 0 ? Math.ceil(remaining / dailyVelocity) : null;
      const forecastDate = forecastDays != null ? new Date(Date.now() + forecastDays * 86_400_000).toISOString().slice(0, 10) : null;

      // OKR: find objectives linked to this project (by naming convention / company scope)
      const objProgress = objectives.length > 0 ? (() => {
        let krDone = 0, krTotal = 0;
        for (const obj of objectives) {
          for (const kr of obj.keyResults) {
            krTotal++;
            const p = kr.targetValue > kr.startValue
              ? (kr.currentValue - kr.startValue) / (kr.targetValue - kr.startValue)
              : 0;
            krDone += Math.max(0, Math.min(1, p));
          }
        }
        return krTotal > 0 ? Math.round((krDone / krTotal) * 100) : 0;
      })() : null;

      return {
        id: p.id, name: p.name, color: p.color, icon: p.icon,
        total, done, overdue, progress,
        memberCount: p._count.members,
        riskCount:   riskMap[p.id] ?? 0,
        health:      healthMap[p.id] ?? null,
        forecastDate,
        forecastDays,
        dailyVelocity: Math.round(dailyVelocity * 10) / 10,
        okrProgress: objProgress,
      };
    });
  }

  async getForecast(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.checkCompanyAccess(project.companyId, userId);

    const since30 = new Date(Date.now() - 30 * 86_400_000);

    const [allTasks, recentDone] = await Promise.all([
      this.prisma.task.count({ where: { projectId } }),
      this.prisma.task.count({
        where: { projectId, status: 'DONE', updatedAt: { gte: since30 } },
      }),
    ]);

    const doneTasks = await this.prisma.task.count({ where: { projectId, status: 'DONE' } });
    const remaining = allTasks - doneTasks;
    const dailyVelocity = recentDone / 30;

    const forecastDays = dailyVelocity > 0 ? Math.ceil(remaining / dailyVelocity) : null;
    const forecastDate = forecastDays != null
      ? new Date(Date.now() + forecastDays * 86_400_000).toISOString().slice(0, 10)
      : null;

    const progress = allTasks > 0 ? Math.round((doneTasks / allTasks) * 100) : 0;

    return {
      projectId,
      projectName: project.name,
      totalTasks: allTasks,
      doneTasks,
      remaining,
      progress,
      dailyVelocity: Math.round(dailyVelocity * 100) / 100,
      weeklyVelocity: Math.round(dailyVelocity * 7 * 10) / 10,
      forecastDays,
      forecastDate,
      confidence: dailyVelocity > 0 ? (recentDone >= 5 ? 'HIGH' : 'MEDIUM') : 'LOW',
    };
  }

  private async checkCompanyAccess(companyId: string, userId: string) {
    const membership = await this.prisma.userCompany.findFirst({ where: { companyId, userId } });
    if (!membership) throw new ForbiddenException('Sem acesso a este projeto');
  }
}
