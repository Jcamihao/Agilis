import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto, UseTaskTemplateDto } from './dto/task-template.dto';

@Injectable()
export class TaskTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(companyId: string) {
    return this.prisma.taskTemplate.findMany({
      where: { companyId },
      include: { createdBy: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateTaskTemplateDto, userId: string) {
    await this.checkAccess(dto.companyId, userId);
    return this.prisma.taskTemplate.create({
      data: {
        companyId:      dto.companyId,
        name:           dto.name,
        description:    dto.description,
        priority:       dto.priority ?? 'MEDIUM',
        checklist:      (dto.checklist ?? []) as any,
        estimatedHours: dto.estimatedHours,
        createdById:    userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, dto: UpdateTaskTemplateDto, userId: string) {
    const tpl = await this.prisma.taskTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Template não encontrado');
    await this.checkAccess(tpl.companyId, userId);
    return this.prisma.taskTemplate.update({
      where: { id },
      data: {
        ...(dto.name           !== undefined && { name:           dto.name }),
        ...(dto.description    !== undefined && { description:    dto.description }),
        ...(dto.priority       !== undefined && { priority:       dto.priority }),
        ...(dto.checklist      !== undefined && { checklist:      dto.checklist as any }),
        ...(dto.estimatedHours !== undefined && { estimatedHours: dto.estimatedHours }),
      },
    });
  }

  async delete(id: string, userId: string) {
    const tpl = await this.prisma.taskTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Template não encontrado');
    await this.checkAccess(tpl.companyId, userId);
    return this.prisma.taskTemplate.delete({ where: { id } });
  }

  async useTemplate(id: string, dto: UseTaskTemplateDto, userId: string) {
    const tpl = await this.prisma.taskTemplate.findUnique({ where: { id } });
    if (!tpl) throw new NotFoundException('Template não encontrado');

    const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
    if (!project) throw new NotFoundException('Projeto não encontrado');
    await this.checkAccess(project.companyId, userId);

    return this.prisma.task.create({
      data: {
        title:       tpl.name,
        description: tpl.description,
        priority:    tpl.priority,
        status:      'BACKLOG',
        position:    0,
        projectId:   dto.projectId,
        assigneeId:  dto.assigneeId,
        sprintId:    dto.sprintId,
        creatorId:   userId,
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        creator:  { select: { id: true, name: true } },
        labels:   { include: { label: true } },
        _count:   { select: { comments: true, subtasks: true, timeEntries: true } },
      },
    });
  }

  private async checkAccess(companyId: string, userId: string) {
    const membership = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!membership) throw new ForbiddenException('Acesso negado');
  }
}
