import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface ScoreBreakdown {
  overdueDeduction: number;
  slaDeduction: number;
  backlogDeduction: number;
  inactivityDeduction: number;
  completionBonus: number;
  base: number;
}

@Injectable()
export class HealthScoreService {
  private readonly logger = new Logger(HealthScoreService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── Cron: recalculate all scores nightly ─────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async recalculateAll() {
    this.logger.log('Recalculating health scores...');
    const companies = await this.prisma.company.findMany({
      select: { id: true },
    });
    for (const c of companies) {
      await this.calculateCompanyScore(c.id).catch(() => {});
    }
    this.logger.log(`Recalculated scores for ${companies.length} companies`);
  }

  // ── Company Score ─────────────────────────────────────────────────────────

  async calculateCompanyScore(companyId: string) {
    const [
      total,
      overdue,
      completed,
      slaBreached,
      slaTotal,
      backlog,
      lastActivity,
    ] = await Promise.all([
      this.prisma.task.count({ where: { project: { companyId } } }),
      this.prisma.task.count({
        where: {
          project: { companyId },
          dueDate: { lt: new Date() },
          status: { not: 'DONE' },
        },
      }),
      this.prisma.task.count({
        where: { project: { companyId }, status: 'DONE' },
      }),
      this.prisma.slaRecord.count({
        where: { isBreached: true, task: { project: { companyId } } },
      }),
      this.prisma.slaRecord.count({
        where: { task: { project: { companyId } } },
      }),
      this.prisma.task.count({
        where: { project: { companyId }, status: 'BACKLOG' },
      }),
      this.prisma.activity.findFirst({
        where: { task: { project: { companyId } } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const { score, breakdown } = this.computeScore(
      total,
      overdue,
      completed,
      slaBreached,
      slaTotal,
      backlog,
      lastActivity?.createdAt,
    );

    const existing = await this.prisma.healthScore.findFirst({
      where: { companyId, entityType: 'COMPANY', entityId: companyId },
    });

    const trend = existing
      ? [{ score: existing.score, date: existing.calculatedAt.toISOString() }]
      : [];

    return this.prisma.healthScore.upsert({
      where: existing ? { id: existing.id } : { id: 'new' },
      update: {
        score,
        breakdown: breakdown as unknown as Prisma.InputJsonValue,
        trend: trend as Prisma.InputJsonValue,
        calculatedAt: new Date(),
      },
      create: {
        companyId,
        entityType: 'COMPANY',
        entityId: companyId,
        score,
        breakdown: breakdown as unknown as Prisma.InputJsonValue,
        trend: trend as Prisma.InputJsonValue,
      },
    });
  }

  async calculateTeamScore(teamId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      select: { companyId: true },
    });
    if (!team) return null;

    const [total, overdue, completed, backlog] = await Promise.all([
      this.prisma.task.count({ where: { project: { teamId } } }),
      this.prisma.task.count({
        where: {
          project: { teamId },
          dueDate: { lt: new Date() },
          status: { not: 'DONE' },
        },
      }),
      this.prisma.task.count({
        where: { project: { teamId }, status: 'DONE' },
      }),
      this.prisma.task.count({
        where: { project: { teamId }, status: 'BACKLOG' },
      }),
    ]);

    const { score, breakdown } = this.computeScore(
      total,
      overdue,
      completed,
      0,
      0,
      backlog,
    );

    return this.prisma.healthScore.upsert({
      where: { id: `team-${teamId}` },
      update: {
        score,
        breakdown: breakdown as unknown as Prisma.InputJsonValue,
        calculatedAt: new Date(),
      },
      create: {
        id: `team-${teamId}`,
        companyId: team.companyId,
        entityType: 'TEAM',
        entityId: teamId,
        score,
        breakdown: breakdown as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async calculateProjectScore(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { companyId: true },
    });
    if (!project) return null;

    const [total, overdue, completed, backlog, lastActivity] =
      await Promise.all([
        this.prisma.task.count({ where: { projectId } }),
        this.prisma.task.count({
          where: {
            projectId,
            dueDate: { lt: new Date() },
            status: { not: 'DONE' },
          },
        }),
        this.prisma.task.count({ where: { projectId, status: 'DONE' } }),
        this.prisma.task.count({ where: { projectId, status: 'BACKLOG' } }),
        this.prisma.activity.findFirst({
          where: { task: { projectId } },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

    const { score, breakdown } = this.computeScore(
      total,
      overdue,
      completed,
      0,
      0,
      backlog,
      lastActivity?.createdAt,
    );

    return this.prisma.healthScore.upsert({
      where: { id: `project-${projectId}` },
      update: {
        score,
        breakdown: breakdown as unknown as Prisma.InputJsonValue,
        calculatedAt: new Date(),
      },
      create: {
        id: `project-${projectId}`,
        companyId: project.companyId,
        entityType: 'PROJECT',
        entityId: projectId,
        score,
        breakdown: breakdown as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  async getCompanyScore(companyId: string) {
    let score = await this.prisma.healthScore.findFirst({
      where: { companyId, entityType: 'COMPANY', entityId: companyId },
    });

    if (!score) score = await this.calculateCompanyScore(companyId);
    return {
      ...score,
      label: this.getLabel(score.score),
      color: this.getColor(score.score),
    };
  }

  async getTeamsScores(companyId: string) {
    const teams = await this.prisma.team.findMany({
      where: { companyId },
      select: { id: true, name: true, color: true },
    });

    return Promise.all(
      teams.map(async (team) => {
        let score = await this.prisma.healthScore.findFirst({
          where: { entityType: 'TEAM', entityId: team.id },
        });
        if (!score) score = await this.calculateTeamScore(team.id);
        return {
          team,
          score: score.score,
          breakdown: score.breakdown,
          label: this.getLabel(score.score),
          color: this.getColor(score.score),
        };
      }),
    );
  }

  async getProjectsScores(companyId: string) {
    const projects = await this.prisma.project.findMany({
      where: { companyId, isArchived: false },
      select: { id: true, name: true, color: true, icon: true },
    });

    return Promise.all(
      projects.map(async (project) => {
        let score = await this.prisma.healthScore.findFirst({
          where: { entityType: 'PROJECT', entityId: project.id },
        });
        if (!score) score = await this.calculateProjectScore(project.id);
        return {
          project,
          score: score.score,
          breakdown: score.breakdown,
          label: this.getLabel(score.score),
          color: this.getColor(score.score),
        };
      }),
    );
  }

  // ── Algorithm ─────────────────────────────────────────────────────────────

  private computeScore(
    total: number,
    overdue: number,
    completed: number,
    slaBreached: number,
    slaTotal: number,
    backlog: number,
    lastActivity?: Date,
  ): { score: number; breakdown: ScoreBreakdown } {
    let base = 100;

    // Overdue penalty: up to -35 points
    const overdueRate = total > 0 ? overdue / total : 0;
    const overdueDeduction = Math.round(Math.min(35, overdueRate * 100));

    // SLA breach penalty: up to -20 points
    const slaRate = slaTotal > 0 ? slaBreached / slaTotal : 0;
    const slaDeduction = Math.round(Math.min(20, slaRate * 40));

    // Backlog penalty: up to -15 points
    const backlogRate = total > 0 ? backlog / total : 0;
    const backlogDeduction = Math.round(Math.min(15, backlogRate * 25));

    // Inactivity penalty: up to -10 points
    let inactivityDeduction = 0;
    if (lastActivity) {
      const daysSince = Math.floor(
        (Date.now() - lastActivity.getTime()) / 86_400_000,
      );
      if (daysSince > 3)
        inactivityDeduction = Math.min(10, Math.floor(daysSince / 2));
    } else if (total > 0) {
      inactivityDeduction = 10;
    }

    // Completion bonus: up to +20 points
    const completionRate = total > 0 ? completed / total : 0;
    const completionBonus = Math.round(Math.min(20, completionRate * 25));

    const score = Math.max(
      0,
      Math.min(
        100,
        base -
          overdueDeduction -
          slaDeduction -
          backlogDeduction -
          inactivityDeduction +
          completionBonus,
      ),
    );

    return {
      score,
      breakdown: {
        base,
        overdueDeduction,
        slaDeduction,
        backlogDeduction,
        inactivityDeduction,
        completionBonus,
      },
    };
  }

  getLabel(score: number): string {
    if (score >= 85) return 'Excelente';
    if (score >= 70) return 'Bom';
    if (score >= 50) return 'Regular';
    if (score >= 30) return 'Crítico';
    return 'Alerta Máximo';
  }

  getColor(score: number): string {
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    if (score >= 30) return '#ef4444';
    return '#7f1d1d';
  }
}
