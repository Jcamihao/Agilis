import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatRedistribution } from '../ai/ai.formatters';
import { SelahAiClientService, SelahAiError } from '../ai/selah-ai-client.service';

export interface MemberWorkload {
  user: { id: string; name: string; avatarUrl: string | null };
  total: number;
  overdue: number;
  dueSoon: number;        // next 7 days
  inProgress: number;
  backlog: number;
  done: number;
  trackedMinThisWeek: number;
  capacityScore: number;  // 0–100: 0=idle, 100=overloaded
  status: 'idle' | 'balanced' | 'busy' | 'overloaded';
  dailyLoad: { date: string; count: number }[]; // next 14 days
}

@Injectable()
export class WorkloadService {
  private readonly logger = new Logger(WorkloadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly selah: SelahAiClientService,
  ) {}

  // ── Company workload ───────────────────────────────────────────────────────

  async getCompanyWorkload(companyId: string, projectId?: string, weekStartRaw?: string) {
    // weekStart = "YYYY-MM-DD" (dia em que a grade de 14 dias começa). Inválido/ausente = hoje.
    // O regex barra formatos errados; o parse rejeita datas inexistentes como "2027-13-99".
    let weekStart: string | undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(weekStartRaw ?? '') && !Number.isNaN(new Date(weekStartRaw + 'T00:00:00').getTime())) {
      weekStart = weekStartRaw;
    }

    const users = await this.prisma.user.findMany({
      where: { companies: { some: { companyId } } },
      select: { id: true, name: true, avatarUrl: true },
    });

    const results = await Promise.all(
      users.map(u => this.buildMemberWorkload(u, companyId, projectId, weekStart)),
    );

    // Sort: overloaded first, then busy, balanced, idle
    const order = { overloaded: 0, busy: 1, balanced: 2, idle: 3 };
    results.sort((a, b) => order[a.status] - order[b.status]);

    const totalTasks   = results.reduce((s, r) => s + r.total, 0);
    const avgCapacity  = results.length
      ? Math.round(results.reduce((s, r) => s + r.capacityScore, 0) / results.length)
      : 0;
    const overloaded   = results.filter(r => r.status === 'overloaded').length;
    const idle         = results.filter(r => r.status === 'idle').length;

    return {
      members: results,
      totalTasks,
      avgCapacity,
      overloaded,
      idle,
      weekStart: results[0]?.dailyLoad[0]?.date ?? new Date().toISOString().slice(0, 10),
    };
  }

  // ── AI redistribution suggestion ──────────────────────────────────────────

  async suggestRedistribution(companyId: string) {
    const { members } = await this.getCompanyWorkload(companyId);

    const overloaded = members.filter(m => m.status === 'overloaded');
    const available  = members.filter(m => m.status === 'idle' || m.status === 'balanced');

    if (!overloaded.length) {
      return { suggestion: 'Carga de trabalho equilibrada. Nenhuma redistribuição necessária no momento.' };
    }

    const toPayload = (member: (typeof members)[number]) => ({
      name: member.user.name.slice(0, 120),
      openTasks: member.total,
      overdueTasks: member.overdue,
      capacityScore: member.capacityScore,
    });

    let suggestion: string;
    try {
      suggestion = formatRedistribution(
        await this.selah.workloadRedistribution({
          overloaded: overloaded.slice(0, 30).map(toPayload),
          available: available.slice(0, 30).map(toPayload),
        }),
      );
    } catch (err) {
      this.logger.error(`Selah IA falhou na redistribuição de carga (status=${err instanceof SelahAiError ? err.status : 'n/a'})`);
      suggestion = 'Não foi possível gerar sugestão de IA no momento.';
    }

    return { suggestion, overloaded: overloaded.length, available: available.length };
  }

  // ── Per-member calculation ─────────────────────────────────────────────────

  private async buildMemberWorkload(
    user: { id: string; name: string; avatarUrl: string | null },
    companyId: string,
    projectId?: string,
    weekStart?: string,
  ): Promise<MemberWorkload> {
    const now      = new Date();
    const in7days  = new Date(now.getTime() + 7 * 86_400_000);
    // Semana do tempo registrado: a pedida (?weekStart) ou os últimos 7 dias (padrão).
    const trackFrom = weekStart ? new Date(weekStart + 'T00:00:00') : new Date(now.getTime() - 7 * 86_400_000);
    const trackTo   = weekStart ? new Date(trackFrom.getTime() + 7 * 86_400_000) : now;

    const taskWhere: any = {
      assigneeId: user.id,
      project:    { companyId, ...(projectId ? { id: projectId } : {}) },
    };

    const [total, overdue, dueSoon, inProgress, backlog, done, trackedMin] = await Promise.all([
      this.prisma.task.count({ where: { ...taskWhere, status: { not: 'DONE' } } }),
      this.prisma.task.count({ where: { ...taskWhere, status: { not: 'DONE' }, dueDate: { lt: now } } }),
      this.prisma.task.count({ where: { ...taskWhere, status: { not: 'DONE' }, dueDate: { gte: now, lte: in7days } } }),
      this.prisma.task.count({ where: { ...taskWhere, status: 'IN_PROGRESS' } }),
      this.prisma.task.count({ where: { ...taskWhere, status: 'BACKLOG' } }),
      this.prisma.task.count({ where: { assigneeId: user.id, project: { companyId }, status: 'DONE' } }),
      this.prisma.timeEntry.aggregate({
        where: { userId: user.id, startedAt: { gte: trackFrom, lt: trackTo } },
        _sum: { durationMin: true },
      }),
    ]);

    const trackedMinThisWeek = trackedMin._sum.durationMin ?? 0;

    // Capacity score: weighted formula (0–100)
    const capacityScore = Math.min(100, Math.round(
      (total * 5) + (overdue * 15) + (dueSoon * 8) + (inProgress * 3)
    ));

    const status: MemberWorkload['status'] =
      capacityScore >= 80 ? 'overloaded' :
      capacityScore >= 50 ? 'busy' :
      capacityScore >= 15 ? 'balanced' : 'idle';

    // Daily load for the 14 days from weekStart (or from today)
    const dailyLoad = await this.buildDailyLoad(user.id, companyId, projectId, weekStart);

    return {
      user, total, overdue, dueSoon, inProgress, backlog, done,
      trackedMinThisWeek, capacityScore, status, dailyLoad,
    };
  }

  private async buildDailyLoad(userId: string, companyId: string, projectId?: string, weekStart?: string) {
    // Âncora local do primeiro dia; sem weekStart, hoje (comportamento histórico).
    const first = weekStart ? new Date(weekStart + 'T00:00:00') : new Date();
    first.setHours(0, 0, 0, 0);
    const last = new Date(first);
    last.setDate(last.getDate() + 14);

    // Uma query por membro (antes eram 14 counts sequenciais) e bucketing em JS.
    const tasks = await this.prisma.task.findMany({
      where: {
        assigneeId: userId,
        status:     { not: 'DONE' },
        project:    { companyId, ...(projectId ? { id: projectId } : {}) },
        dueDate:    { gte: first, lt: last },
      },
      select: { dueDate: true },
    });

    const days: { date: string; count: number }[] = [];
    const indexByDay = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(first);
      d.setDate(d.getDate() + i);
      indexByDay.set(d.toISOString().slice(0, 10), i);
      days.push({ date: d.toISOString().slice(0, 10), count: 0 });
    }
    for (const t of tasks) {
      const d = new Date(t.dueDate!);
      d.setHours(0, 0, 0, 0);
      const idx = indexByDay.get(d.toISOString().slice(0, 10));
      if (idx !== undefined) days[idx].count++;
    }

    return days;
  }
}
