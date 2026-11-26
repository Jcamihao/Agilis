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
    const [overdue, stagnant, backlog, unassignedUrgent, riskyProjects, dueWeek] = await Promise.all([
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
      this.prisma.task.findMany({
        where: {
          project: { companyId },
          assigneeId: null,
          status: { not: 'DONE' },
          dueDate: { lt: new Date(Date.now() + 3 * 86_400_000) },
        },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
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
      // Conflito de prazos: tarefas atribuídas vencendo nos próximos 7 dias, agrupadas por pessoa.
      // (Sem orderBy/_min no groupBy: dispara um bug de inferência de tipos do Prisma 5; ordenar em JS.)
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: {
          project: { companyId },
          status: { not: 'DONE' },
          assigneeId: { not: null },
          dueDate: { gte: new Date(), lt: new Date(Date.now() + 7 * 86_400_000) },
        },
        _count: { _all: true },
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

    if (unassignedUrgent.length) {
      insights.push({
        companyId,
        type: 'RISK',
        severity: unassignedUrgent.length >= 5 ? 'HIGH' : 'MEDIUM',
        title: `${unassignedUrgent.length} tarefa(s) urgente(s) sem responsável`,
        description: `${unassignedUrgent[0].title} em ${unassignedUrgent[0].project.name} vence em breve e não tem ninguém atribuído. Defina um responsável antes do prazo.`,
        entityType: 'task',
        entityId: unassignedUrgent[0].id,
        metadata: { count: unassignedUrgent.length },
        expiresAt: this.expiresInDays(3),
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

    // ≥3 tarefas do mesmo responsável vencendo na mesma janela de 7 dias = uma pessoa afogando.
    const crowded = dueWeek
      .filter((g) => g.assigneeId && g._count._all >= 3)
      .sort((a, b) => b._count._all - a._count._all);
    if (crowded.length) {
      const people = await this.prisma.user.findMany({
        where: { id: { in: crowded.map((g) => g.assigneeId as string) } },
        select: { id: true, name: true },
      });
      const nameOf = new Map(people.map((p) => [p.id, p.name]));
      const top = crowded[0];
      const who = nameOf.get(top.assigneeId as string) ?? 'um responsável';
      insights.push({
        companyId,
        type: 'DEADLINE_CONFLICT',
        severity: top._count._all >= 5 ? 'CRITICAL' : 'HIGH',
        title: `${who} concentra ${top._count._all} tarefas vencendo nesta semana`,
        description: `Com ${top._count._all} prazos na mesma janela, algo vai estourar. Adiante uma entrega, mova um prazo ou realoque com o Workload.`,
        entityType: 'user',
        entityId: top.assigneeId as string,
        metadata: { count: top._count._all, affected: crowded.length },
        expiresAt: this.expiresInDays(5),
      });
    }

    if (!insights.length) {
      insights.push({
        companyId,
        type: 'ACHIEVEMENT',
        severity: 'LOW',
        title: 'Operação sem riscos críticos',
        description: 'Nenhum gargalo severo foi detectado agora. Continue monitorando backlog e tarefas próximas do vencimento.',
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
