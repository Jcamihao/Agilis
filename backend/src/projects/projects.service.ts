import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';

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
  constructor(private readonly prisma: PrismaService) {}

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

  private async checkCompanyAccess(companyId: string, userId: string) {
    const membership = await this.prisma.userCompany.findFirst({ where: { companyId, userId } });
    if (!membership) throw new ForbiddenException('Sem acesso a este projeto');
  }
}
