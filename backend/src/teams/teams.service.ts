import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto, AddTeamMemberDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(companyId: string, userId: string) {
    await this.checkCompanyAccess(companyId, userId);

    return this.prisma.team.findMany({
      where: { companyId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        _count: { select: { projects: true, members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        projects: {
          include: { _count: { select: { tasks: true } } },
        },
      },
    });

    if (!team) throw new NotFoundException('Equipe não encontrada');
    await this.checkCompanyAccess(team.companyId, userId);
    return team;
  }

  async create(dto: CreateTeamDto, userId: string) {
    await this.checkCompanyAccess(dto.companyId, userId);

    const extraMembers = (dto.members ?? [])
      .filter((m) => m.userId !== userId)
      .map((m) => ({ userId: m.userId, role: (m.role as any) || 'MEMBER' }));

    return this.prisma.team.create({
      data: {
        name: dto.name,
        color: dto.color || '#6366f1',
        companyId: dto.companyId,
        members: {
          create: [
            { userId, role: 'OWNER' },
            ...extraMembers,
          ],
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        _count: { select: { projects: true, members: true } },
      },
    });
  }

  async update(id: string, dto: Partial<CreateTeamDto>, userId: string) {
    const team = await this.prisma.team.findUnique({ where: { id } });
    if (!team) throw new NotFoundException('Equipe não encontrada');
    await this.checkCompanyAccess(team.companyId, userId);

    const { companyId: _, members: __, ...data } = dto as any;
    return this.prisma.team.update({ where: { id }, data });
  }

  async addMember(teamId: string, dto: AddTeamMemberDto, requesterId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Equipe não encontrada');
    await this.checkCompanyAccess(team.companyId, requesterId);

    return this.prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId: dto.userId } },
      update: { role: dto.role as any || 'MEMBER' },
      create: { teamId, userId: dto.userId, role: dto.role as any || 'MEMBER' },
    });
  }

  async removeMember(teamId: string, memberId: string, requesterId: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Equipe não encontrada');
    await this.checkCompanyAccess(team.companyId, requesterId);

    return this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: memberId } },
    });
  }

  private async checkCompanyAccess(companyId: string, userId: string) {
    const membership = await this.prisma.userCompany.findFirst({ where: { companyId, userId } });
    if (!membership) throw new ForbiddenException('Sem acesso a esta empresa');
  }
}
