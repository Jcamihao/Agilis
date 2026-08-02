import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const USER_SELECT = { id: true, name: true, avatarUrl: true, email: true };

@Injectable()
export class HrService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Profiles / Diretório ──────────────────────────────────────────────────

  async listProfiles(companyId: string) {
    return this.prisma.hrProfile.findMany({
      where: { companyId },
      include: {
        user: { select: USER_SELECT },
        manager: { include: { user: { select: USER_SELECT } } },
        _count: { select: { reports: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });
  }

  async upsertProfile(userId: string, companyId: string, dto: {
    jobTitle?: string;
    department?: string;
    managerId?: string;
    admissionDate?: string;
    birthDate?: string;
    status?: 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';
  }) {
    return this.prisma.hrProfile.upsert({
      where: { userId },
      create: {
        userId,
        companyId,
        jobTitle: dto.jobTitle,
        department: dto.department,
        managerId: dto.managerId ?? null,
        admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : null,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        status: dto.status ?? 'ACTIVE',
      },
      update: {
        jobTitle: dto.jobTitle,
        department: dto.department,
        managerId: dto.managerId ?? null,
        admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        status: dto.status,
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  // ── Organograma ───────────────────────────────────────────────────────────

  async orgChart(companyId: string) {
    const profiles = await this.prisma.hrProfile.findMany({
      where: { companyId },
      include: { user: { select: USER_SELECT } },
    });

    const roots = profiles.filter(p => !p.managerId);
    const buildTree = (managerId: string | null): any[] =>
      profiles
        .filter(p => p.managerId === managerId)
        .map(p => ({ ...p, children: buildTree(p.userId) }));

    return roots.map(r => ({ ...r, children: buildTree(r.userId) }));
  }

  // ── Aniversários ──────────────────────────────────────────────────────────

  async birthdays(companyId: string) {
    const profiles = await this.prisma.hrProfile.findMany({
      where: { companyId, birthDate: { not: null } },
      include: { user: { select: USER_SELECT } },
      orderBy: { birthDate: 'asc' },
    });
    const today = new Date();
    return profiles
      .filter(p => p.birthDate)
      .map(p => {
        const bd = p.birthDate!;
        const next = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
        if (next < today) next.setFullYear(today.getFullYear() + 1);
        const daysUntil = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
        return { ...p, daysUntil };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }

  // ── Férias / Ausências ───────────────────────────────────────────────────

  async listLeave(companyId: string, userId?: string) {
    return this.prisma.leaveRequest.findMany({
      where: { companyId, ...(userId ? { userId } : {}) },
      include: {
        user:       { select: USER_SELECT },
        approvedBy: { select: USER_SELECT },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async createLeave(companyId: string, userId: string, dto: {
    type: string; startDate: string; endDate: string; reason?: string;
  }) {
    return this.prisma.leaveRequest.create({
      data: {
        companyId,
        userId,
        type: dto.type as any,
        startDate: new Date(dto.startDate),
        endDate:   new Date(dto.endDate),
        reason:    dto.reason,
      },
      include: { user: { select: USER_SELECT } },
    });
  }

  async reviewLeave(id: string, approverId: string, approve: boolean) {
    const req = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitação não encontrada');
    return this.prisma.leaveRequest.update({
      where: { id },
      data: {
        status:      approve ? 'APPROVED' : 'REJECTED',
        approvedById: approverId,
        approvedAt:  new Date(),
      },
      include: { user: { select: USER_SELECT }, approvedBy: { select: USER_SELECT } },
    });
  }

  async cancelLeave(id: string) {
    return this.prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } });
  }

  // ── Ponto Eletrônico ─────────────────────────────────────────────────────

  async clockIn(companyId: string, userId: string, type: string, note?: string) {
    return this.prisma.timeRecord.create({
      data: { companyId, userId, type: type as any, note },
    });
  }

  async listTimeRecords(companyId: string, userId: string, date?: string) {
    const start = date ? new Date(date) : new Date(new Date().setHours(0, 0, 0, 0));
    const end   = new Date(start);
    end.setDate(end.getDate() + 1);
    return this.prisma.timeRecord.findMany({
      where: { companyId, userId, timestamp: { gte: start, lt: end } },
      orderBy: { timestamp: 'asc' },
    });
  }

  async listAllTimeRecords(companyId: string, date?: string) {
    const start = date ? new Date(date) : new Date(new Date().setHours(0, 0, 0, 0));
    const end   = new Date(start);
    end.setDate(end.getDate() + 1);
    return this.prisma.timeRecord.findMany({
      where: { companyId, timestamp: { gte: start, lt: end } },
      include: { user: { select: USER_SELECT } },
      orderBy: { timestamp: 'asc' },
    });
  }
}
