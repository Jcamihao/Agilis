import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.company.findMany({
      where: { users: { some: { userId } } },
      include: {
        _count: { select: { teams: true, projects: true, users: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id, users: { some: { userId } } },
      include: {
        teams: { include: { _count: { select: { members: true } } } },
        projects: { include: { _count: { select: { tasks: true } } } },
        users: { include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } } },
        _count: { select: { teams: true, projects: true, users: true } },
      },
    });

    if (!company) throw new NotFoundException('Empresa não encontrada');
    return company;
  }

  async create(dto: CreateCompanyDto, userId: string) {
    const slug = dto.slug || dto.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

    return this.prisma.company.create({
      data: {
        name: dto.name,
        slug: `${slug}-${Date.now().toString(36)}`,
        logoUrl: dto.logoUrl,
        users: { create: { userId, role: 'OWNER' } },
      },
    });
  }

  async update(id: string, dto: Partial<CreateCompanyDto>, userId: string) {
    await this.checkOwnership(id, userId);
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  async getDashboardStats(companyId: string, userId: string) {
    await this.checkMembership(companyId, userId);

    const [totalTasks, completedTasks, overdueTasks, activeProjects, recentActivities] = await Promise.all([
      this.prisma.task.count({ where: { project: { companyId } } }),
      this.prisma.task.count({ where: { project: { companyId }, status: 'DONE' } }),
      this.prisma.task.count({
        where: {
          project: { companyId },
          dueDate: { lt: new Date() },
          status: { not: 'DONE' },
        },
      }),
      this.prisma.project.count({ where: { companyId, isArchived: false } }),
      this.prisma.activity.findMany({
        where: { task: { project: { companyId } } },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return { totalTasks, completedTasks, overdueTasks, activeProjects, recentActivities };
  }

  private async checkOwnership(companyId: string, userId: string) {
    const membership = await this.prisma.userCompany.findFirst({
      where: { companyId, userId, role: { in: ['OWNER', 'ADMIN'] } },
    });
    if (!membership) throw new ForbiddenException('Sem permissão para esta ação');
  }

  private async checkMembership(companyId: string, userId: string) {
    const membership = await this.prisma.userCompany.findFirst({ where: { companyId, userId } });
    if (!membership) throw new ForbiddenException('Sem acesso a esta empresa');
  }
}
