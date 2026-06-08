import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

export interface AuditLogDto {
  userId: string;
  companyId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(dto: AuditLogDto) {
    return this.prisma.auditLog.create({ data: dto }).catch(() => null);
  }

  async findAll(companyId: string, filters: {
    userId?: string;
    entityType?: string;
    action?: AuditAction;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { userId, entityType, action, from, to, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { companyId };
    if (userId)     where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (action)     where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats(companyId: string) {
    const since = new Date(Date.now() - 30 * 86_400_000);

    const [total, byAction, byUser] = await Promise.all([
      this.prisma.auditLog.count({ where: { companyId, createdAt: { gte: since } } }),

      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { companyId, createdAt: { gte: since } },
        _count: { action: true },
        orderBy: { _count: { action: 'desc' } },
      }),

      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: { companyId, createdAt: { gte: since } },
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return { total, byAction, byUser };
  }
}
