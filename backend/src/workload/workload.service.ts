import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService,
  ) {}

  // ── Company workload ───────────────────────────────────────────────────────

  async getCompanyWorkload(companyId: string, projectId?: string) {
    const users = await this.prisma.user.findMany({
      where: { companies: { some: { companyId } } },
      select: { id: true, name: true, avatarUrl: true },
    });

    const results = await Promise.all(
      users.map(u => this.buildMemberWorkload(u, companyId, projectId)),
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

    return { members: results, totalTasks, avgCapacity, overloaded, idle };
  }

  // ── AI redistribution suggestion ──────────────────────────────────────────

  async suggestRedistribution(companyId: string) {
    const { members } = await this.getCompanyWorkload(companyId);

    const overloaded = members.filter(m => m.status === 'overloaded');
    const available  = members.filter(m => m.status === 'idle' || m.status === 'balanced');

    if (!overloaded.length) {
      return { suggestion: 'Carga de trabalho equilibrada. Nenhuma redistribuição necessária no momento.' };
    }

    const prompt = `Analise a carga de trabalho da equipe e sugira redistribuição de tarefas.

Membros sobrecarregados:
${overloaded.map(m => `- ${m.user.name}: ${m.total} tarefas abertas, ${m.overdue} atrasadas, score ${m.capacityScore}/100`).join('\n')}

Membros disponíveis:
${available.map(m => `- ${m.user.name}: ${m.total} tarefas abertas, score ${m.capacityScore}/100`).join('\n')}

Sugira quais tarefas redistribuir e para quem, de forma objetiva e acionável. Máximo 200 palavras.`;

    const suggestion = await (this.ai as any).simpleCompletion(prompt, 400).catch(
      () => 'Não foi possível gerar sugestão de IA no momento.',
    );

    return { suggestion, overloaded: overloaded.length, available: available.length };
  }

  // ── Per-member calculation ─────────────────────────────────────────────────

  private async buildMemberWorkload(
    user: { id: string; name: string; avatarUrl: string | null },
    companyId: string,
    projectId?: string,
  ): Promise<MemberWorkload> {
    const now      = new Date();
    const in7days  = new Date(now.getTime() + 7 * 86_400_000);
    const weekAgo  = new Date(now.getTime() - 7 * 86_400_000);

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
        where: { userId: user.id, startedAt: { gte: weekAgo } },
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

    // Daily load for next 14 days
    const dailyLoad = await this.buildDailyLoad(user.id, companyId, projectId);

    return {
      user, total, overdue, dueSoon, inProgress, backlog, done,
      trackedMinThisWeek, capacityScore, status, dailyLoad,
    };
  }

  private async buildDailyLoad(userId: string, companyId: string, projectId?: string) {
    const days: { date: string; count: number }[] = [];
    const now = new Date();

    const taskWhere: any = {
      assigneeId: userId,
      status:     { not: 'DONE' },
      project:    { companyId, ...(projectId ? { id: projectId } : {}) },
    };

    for (let i = 0; i < 14; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);

      const count = await this.prisma.task.count({
        where: { ...taskWhere, dueDate: { gte: d, lt: next } },
      });

      days.push({ date: d.toISOString().slice(0, 10), count });
    }

    return days;
  }
}
