import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaskStatusConfigService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.taskStatusConfig.findMany({
      where: { companyId },
      orderBy: { order: 'asc' },
    });
  }

  create(companyId: string, dto: { name: string; color?: string; order?: number }) {
    return this.prisma.taskStatusConfig.create({
      data: { companyId, name: dto.name, color: dto.color ?? '#6366f1', order: dto.order ?? 0 },
    });
  }

  update(id: string, dto: { name?: string; color?: string; order?: number }) {
    return this.prisma.taskStatusConfig.update({ where: { id }, data: dto });
  }

  delete(id: string) {
    return this.prisma.taskStatusConfig.delete({ where: { id } });
  }
}
