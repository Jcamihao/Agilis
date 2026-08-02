import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LabelsService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.label.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  create(companyId: string, dto: { name: string; color?: string }) {
    return this.prisma.label.create({
      data: { companyId, name: dto.name, color: dto.color ?? '#6366f1' },
    });
  }

  update(id: string, dto: { name?: string; color?: string }) {
    return this.prisma.label.update({ where: { id }, data: dto });
  }

  delete(id: string) {
    return this.prisma.label.delete({ where: { id } });
  }

  addToTask(taskId: string, labelId: string) {
    return this.prisma.taskLabel.upsert({
      where: { taskId_labelId: { taskId, labelId } },
      create: { taskId, labelId },
      update: {},
    });
  }

  removeFromTask(taskId: string, labelId: string) {
    return this.prisma.taskLabel.delete({
      where: { taskId_labelId: { taskId, labelId } },
    });
  }

  getForTask(taskId: string) {
    return this.prisma.taskLabel.findMany({
      where: { taskId },
      include: { label: true },
    });
  }
}
