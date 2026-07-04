import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalStatus, TaskStatus } from '@prisma/client';

export class RequestApprovalDto {
  taskId: string;
  approverId?: string;
  note?: string;
  targetStatus?: TaskStatus;
}

export class ReviewApprovalDto {
  status: 'APPROVED' | 'REJECTED';
  reviewNote?: string;
}

const APPROVAL_INCLUDE = {
  task: {
    select: {
      id: true, title: true, status: true, priority: true,
      project: { select: { id: true, name: true, color: true, icon: true } },
    },
  },
  requestedBy: { select: { id: true, name: true, avatarUrl: true } },
  approver:    { select: { id: true, name: true, avatarUrl: true } },
};

@Injectable()
export class ApprovalsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Request ────────────────────────────────────────────────────────────────

  async request(userId: string, dto: RequestApprovalDto) {
    // Cancel any existing PENDING approval for this task
    await this.prisma.taskApproval.updateMany({
      where:  { taskId: dto.taskId, status: 'PENDING' },
      data:   { status: 'CANCELLED' },
    });

    return this.prisma.taskApproval.create({
      data: {
        taskId:        dto.taskId,
        requestedById: userId,
        approverId:    dto.approverId ?? null,
        note:          dto.note,
        targetStatus:  dto.targetStatus ?? 'DONE',
        status:        'PENDING',
      },
      include: APPROVAL_INCLUDE,
    });
  }

  // ── Review ─────────────────────────────────────────────────────────────────

  async review(approvalId: string, reviewerId: string, dto: ReviewApprovalDto) {
    const approval = await this.prisma.taskApproval.findUnique({
      where: { id: approvalId },
      include: { task: true },
    });
    if (!approval) throw new NotFoundException();
    if (approval.status !== 'PENDING') throw new BadRequestException('Aprovação já resolvida');

    // If approverId was set, only that user can review
    if (approval.approverId && approval.approverId !== reviewerId) {
      throw new ForbiddenException('Você não é o aprovador designado');
    }

    const newStatus: ApprovalStatus = dto.status === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    const [updated] = await this.prisma.$transaction([
      this.prisma.taskApproval.update({
        where: { id: approvalId },
        data: {
          status:     newStatus,
          reviewNote: dto.reviewNote,
          approverId: reviewerId,
          resolvedAt: new Date(),
        },
        include: APPROVAL_INCLUDE,
      }),
      // Move task to targetStatus if approved
      ...(newStatus === 'APPROVED' && approval.targetStatus
        ? [this.prisma.task.update({
            where: { id: approval.taskId },
            data:  { status: approval.targetStatus },
          })]
        : []),
    ]);

    return updated;
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────

  async cancel(approvalId: string, userId: string) {
    const approval = await this.prisma.taskApproval.findUnique({ where: { id: approvalId } });
    if (!approval) throw new NotFoundException();
    if (approval.requestedById !== userId) throw new ForbiddenException();
    if (approval.status !== 'PENDING') throw new BadRequestException('Aprovação já resolvida');
    return this.prisma.taskApproval.update({
      where: { id: approvalId },
      data:  { status: 'CANCELLED', resolvedAt: new Date() },
      include: APPROVAL_INCLUDE,
    });
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  getForTask(taskId: string) {
    return this.prisma.taskApproval.findMany({
      where:   { taskId },
      include: APPROVAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyPending(userId: string) {
    // All pending approvals where user is approver (explicit or any-member-of-project)
    const explicit = await this.prisma.taskApproval.findMany({
      where: { approverId: userId, status: 'PENDING' },
      include: APPROVAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    // Approvals with no approverId for projects where user is a member
    const myProjects = await this.prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const projectIds = myProjects.map(p => p.projectId);

    const open = await this.prisma.taskApproval.findMany({
      where: {
        approverId: null,
        status:     'PENDING',
        requestedById: { not: userId },
        task: { projectId: { in: projectIds } },
      },
      include: APPROVAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    // Deduplicate
    const seen = new Set(explicit.map(a => a.id));
    return [...explicit, ...open.filter(a => !seen.has(a.id))];
  }

  getMyRequested(userId: string) {
    return this.prisma.taskApproval.findMany({
      where:   { requestedById: userId },
      include: APPROVAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take:    50,
    });
  }

  getCompanyPending(companyId: string) {
    return this.prisma.taskApproval.findMany({
      where: {
        status: 'PENDING',
        task: { project: { companyId } },
      },
      include: APPROVAL_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }
}
