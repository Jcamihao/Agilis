import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSprintDto } from './dto/create-sprint.dto';
import { SprintStatus } from '@prisma/client';

@Injectable()
export class SprintsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByProject(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.checkAccess(project.companyId, userId);

    return this.prisma.sprint.findMany({
      where: { projectId },
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateSprintDto, userId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.checkAccess(project.companyId, userId);

    return this.prisma.sprint.create({
      data: {
        name: dto.name,
        goal: dto.goal,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        projectId: dto.projectId,
      },
      include: { _count: { select: { tasks: true } } },
    });
  }

  async updateStatus(id: string, status: SprintStatus, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({ where: { id }, include: { project: true } });
    if (!sprint) throw new NotFoundException('Sprint não encontrada');
    await this.checkAccess(sprint.project.companyId, userId);

    return this.prisma.sprint.update({ where: { id }, data: { status } });
  }

  private async checkAccess(companyId: string, userId: string) {
    const m = await this.prisma.userCompany.findFirst({ where: { companyId, userId } });
    if (!m) throw new ForbiddenException('Sem acesso');
  }
}
