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

  async getBurndown(id: string, userId: string) {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id },
      include: {
        project: true,
        tasks: { select: { id: true, status: true, updatedAt: true } },
      },
    });
    if (!sprint) throw new NotFoundException('Sprint não encontrada');
    await this.checkAccess(sprint.project.companyId, userId);

    const total   = sprint.tasks.length;
    const start   = sprint.startDate ?? new Date(Date.now() - 14 * 86_400_000);
    const end     = sprint.endDate   ?? new Date();
    const dayMs   = 86_400_000;

    const days: { date: string; ideal: number; actual: number }[] = [];
    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / dayMs));

    for (let i = 0; i <= totalDays; i++) {
      const day = new Date(start.getTime() + i * dayMs);
      const dateStr = day.toISOString().slice(0, 10);

      const doneByDay = sprint.tasks.filter(
        (t) => t.status === 'DONE' && t.updatedAt <= day
      ).length;

      const remaining = total - doneByDay;
      const ideal = Math.round(total * (1 - i / totalDays));

      days.push({ date: dateStr, ideal, actual: remaining });
    }

    return { sprintId: id, sprintName: sprint.name, total, days };
  }

  private async checkAccess(companyId: string, userId: string) {
    const m = await this.prisma.userCompany.findFirst({ where: { companyId, userId } });
    if (!m) throw new ForbiddenException('Sem acesso');
  }
}
