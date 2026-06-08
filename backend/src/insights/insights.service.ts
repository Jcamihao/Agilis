import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.insight.findMany({
      where: {
        companyId,
        isDismissed: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });
  }

  @Cron(CronExpression.EVERY_HOUR)
  async generateAll() {
    const companies = await this.prisma.company.findMany({ select: { id: true } });
    for (const company of companies) await this.generate(company.id).catch(() => undefined);
    this.logger.log(`Generated insights for ${companies.length} companies`);
  }

  async generate(companyId: string) {
    const [overdue, stagnant, backlog, slaBreaches, riskyProjects] = await Promise.all([
      this.prisma.task.findMany({
        where: { project: { companyId }, dueDate: { lt: new Date() }, status: { not: 'DONE' } },
        include: { assignee: { select: { name: true } }, project: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      this.prisma.task.findMany({
        where: {
          project: { companyId },
          status: { in: ['IN_PROGRESS', 'IN_REVIEW'] },
          updatedAt: { lt: new Date(Date.now() - 7 * 86_400_000) },
        },
        include: { project: { select: { id: true, name: true } }, assignee: { select: { name: true } } },
        take: 10,
      }),
      this.prisma.task.count({ where: { project: { companyId }, status: 'BACKLOG' } }),
      this.prisma.slaRecord.count({ where: { isBreached: true, task: { project: { companyId } } } }),
      this.prisma.project.findMany({
        where: { companyId, isArchived: false },
        select: {
          id: true,
          name: true,
          _count: { select: { tasks: true } },
          tasks: { where: { status: { not: 'DONE' } }, select: { id: true, dueDate: true } },
        },
        take: 20,
      }),
    ]);

    const insights: Prisma.InsightCreateManyInput[] = [];

    if (overdue.length) {
      insights.push({
        companyId,
        type: 'RISK',
        severity: overdue.length >= 5 ? 'CRITICAL' : 'HIGH',
        title: `${overdue.length} tarefas atrasadas exigem ação`,
        description: `Priorize ${overdue[0].title} em ${overdue[0].project.name}. Responsável: ${overdue[0].assignee?.name ?? 'sem responsável'}.`,
        entityType: 'task',
        entityId: overdue[0].id,
        metadata: { count: overdue.length },
        expiresAt: this.expiresInDays(7),
      });
    }

    if (stagnant.length) {
      insights.push({
        companyId,
        type: 'BOTTLENECK',
        severity: stagnant.length >= 5 ? 'HIGH' : 'MEDIUM',
        title: 'Gargalo detectado em tarefas paradas',
        description: `${stagnant.length} tarefas estão sem avanço há mais de 7 dias. Revise bloqueios e redistribua carga.`,
        entityType: 'project',
        entityId: stagnant[0].project.id,
        metadata: { count: stagnant.length },
        expiresAt: this.expiresInDays(7),
      });
    }

    if (backlog > 20) {
      insights.push({
        companyId,
        type: 'RECOMMENDATION',
        severity: backlog > 50 ? 'HIGH' : 'MEDIUM',
        title: 'Backlog crescendo acima do saudável',
        description: `Existem ${backlog} tarefas em backlog. Faça triagem por prioridade e arquive itens sem dono.`,
        metadata: { backlog },
        expiresAt: this.expiresInDays(14),
      });
    }

    if (slaBreaches) {
      insights.push({
        companyId,
        type: 'RISK',
        severity: slaBreaches > 10 ? 'CRITICAL' : 'HIGH',
        title: 'Risco de contrato por violação de SLA',
        description: `${slaBreaches} registros de SLA foram violados. Acione alertas preventivos e revise metas por fila.`,
        metadata: { slaBreaches },
        expiresAt: this.expiresInDays(7),
      });
    }

    const delayedProject = riskyProjects.find((project) => {
      const open = project.tasks.filter((task) => task.dueDate && task.dueDate < new Date(Date.now() + 3 * 86_400_000));
      return project._count.tasks > 0 && open.length / project._count.tasks > 0.35;
    });
    if (delayedProject) {
      insights.push({
        companyId,
        type: 'DELAY_PREDICTION',
        severity: 'HIGH',
        title: `Atraso previsto em ${delayedProject.name}`,
        description: 'Muitas tarefas abertas vencem nos próximos 3 dias. Replaneje escopo ou aumente capacidade temporariamente.',
        entityType: 'project',
        entityId: delayedProject.id,
        metadata: { openTasks: delayedProject.tasks.length },
        expiresAt: this.expiresInDays(5),
      });
    }

    if (!insights.length) {
      insights.push({
        companyId,
        type: 'ACHIEVEMENT',
        severity: 'LOW',
        title: 'Operação sem riscos críticos',
        description: 'Nenhum gargalo severo foi detectado agora. Continue monitorando SLA, backlog e tarefas próximas do vencimento.',
        expiresAt: this.expiresInDays(3),
      });
    }

    await this.prisma.insight.createMany({ data: insights });
    return this.list(companyId);
  }

  markRead(id: string) {
    return this.prisma.insight.update({ where: { id }, data: { isRead: true } });
  }

  dismiss(id: string) {
    return this.prisma.insight.update({ where: { id }, data: { isDismissed: true } });
  }

  private expiresInDays(days: number) {
    return new Date(Date.now() + days * 86_400_000);
  }
}
