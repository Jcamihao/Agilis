import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatActionPlan, formatAssignees, formatBottlenecks, formatBullets } from './ai.formatters';
import { SelahAiClientService, SelahAiError, SelahWorkspaceContext } from './selah-ai-client.service';

interface WorkspaceContext extends SelahWorkspaceContext {
  companyId: string;
}

const clip = (text: string | null | undefined, max: number) => String(text ?? '').slice(0, max);

// Toda a IA (prompts, provedor, modelo) vive no Selah IA; aqui ficam so os dados do Agilis e a persistencia das conversas.
@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly selah: SelahAiClientService,
  ) {}

  // ── Workspace context ─────────────────────────────────────────────────────

  async buildContext(companyId: string): Promise<WorkspaceContext> {
    const [total, overdue, completed, projects, teams, overdueByUser] = await Promise.all([
      this.prisma.task.count({ where: { project: { companyId } } }),
      this.prisma.task.count({ where: { project: { companyId }, dueDate: { lt: new Date() }, status: { not: 'DONE' } } }),
      this.prisma.task.count({ where: { project: { companyId }, status: 'DONE' } }),
      this.prisma.project.count({ where: { companyId, isArchived: false } }),
      this.prisma.team.count({ where: { companyId } }),
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: { project: { companyId }, dueDate: { lt: new Date() }, status: { not: 'DONE' }, assigneeId: { not: null } },
        _count: { assigneeId: true },
        orderBy: { _count: { assigneeId: 'desc' } },
        take: 5,
      }),
    ]);

    const userIds = overdueByUser.map((u) => u.assigneeId!).filter(Boolean);
    const users   = userIds.length > 0
      ? await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];

    const topOverdueUsers = overdueByUser.map((u) => ({
      name:  users.find((usr) => usr.id === u.assigneeId)?.name ?? 'Desconhecido',
      count: u._count.assigneeId,
    }));

    return { companyId, totalTasks: total, overdueTasks: overdue, completedTasks: completed, activeProjects: projects, topOverdueUsers, backlogCount: total - completed - overdue, teamCount: teams };
  }

  private toWorkspacePayload(ctx: WorkspaceContext): SelahWorkspaceContext {
    const { companyId: _companyId, ...workspace } = ctx;
    return workspace;
  }

  private describeError(err: unknown): string {
    if (err instanceof SelahAiError) {
      if (err.status === 0) return 'O assistente de IA ainda não está configurado.';
      if (err.status === 429) {
        return err.retryAfterSeconds
          ? `O assistente de IA está com muitas solicitações. Tente novamente em ${err.retryAfterSeconds}s.`
          : 'O assistente de IA está com muitas solicitações. Tente novamente em instantes.';
      }
    }
    return 'O assistente de IA está indisponível no momento. Tente novamente em instantes.';
  }

  private fail(err: unknown, operation: string): never {
    const status = err instanceof SelahAiError ? err.status : 'n/a';
    this.logger.error(`Selah IA falhou em ${operation} (status=${status})`);
    throw new ServiceUnavailableException(this.describeError(err));
  }

  // ── Chat ──────────────────────────────────────────────────────────────────

  async chat(companyId: string, userId: string, message: string, conversationId?: string): Promise<{ reply: string; conversationId: string }> {
    const ctx = await this.buildContext(companyId);

    let convId = conversationId;
    if (!convId) {
      const conv = await this.prisma.aiConversation.create({
        data: { companyId, userId, title: message.slice(0, 60) },
      });
      convId = conv.id;
    }

    const history = await this.prisma.aiMessage.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: 'asc' },
      take: 10,
      select: { role: true, content: true },
    });

    try {
      const reply = await this.selah.chat({
        message,
        history: history.map((m) => ({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: clip(m.content, 4000),
        })),
        workspace: this.toWorkspacePayload(ctx),
      });

      await this.prisma.aiMessage.createMany({
        data: [
          { conversationId: convId, role: 'user',      content: message, userId },
          { conversationId: convId, role: 'assistant', content: reply },
        ],
      });

      return { reply, conversationId: convId };
    } catch (err: unknown) {
      this.logger.error(`Selah IA falhou no chat (status=${err instanceof SelahAiError ? err.status : 'n/a'})`);
      return { reply: `❌ ${this.describeError(err)}`, conversationId: convId! };
    }
  }

  // ── Capabilities ──────────────────────────────────────────────────────────

  async summarizeProject(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { tasks: { include: { assignee: { select: { name: true } } } }, team: { select: { name: true } } },
    });
    if (!project) return 'Projeto não encontrado.';

    const done    = project.tasks.filter((t) => t.status === 'DONE').length;
    const overdue = project.tasks.filter((t) => t.dueDate && t.dueDate < new Date() && t.status !== 'DONE');

    try {
      return await this.selah.summarizeProject({
        projectName: clip(project.name, 200),
        totalTasks: project.tasks.length,
        doneTasks: done,
        overdueTasks: overdue.length,
        overdueTaskTitles: overdue.slice(0, 3).map((t) => clip(t.title, 200)),
      });
    } catch (err) {
      this.fail(err, 'resumo de projeto');
    }
  }

  async summarizeTask(taskId: string): Promise<string> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: { select: { name: true } },
        comments: { include: { author: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, take: 5 },
      },
    });
    if (!task) return 'Tarefa não encontrada.';

    try {
      return await this.selah.summarizeTask({
        title: clip(task.title, 200),
        status: task.status,
        priority: task.priority,
        assigneeName: task.assignee?.name ?? null,
        comments: task.comments.map((c) => ({ authorName: clip(c.author.name, 120), content: clip(c.content, 1000) })),
      });
    } catch (err) {
      this.fail(err, 'resumo de tarefa');
    }
  }

  async generateActionPlan(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          where: { status: { not: 'DONE' } },
          include: { assignee: { select: { name: true } } },
          orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
          take: 10,
        },
      },
    });
    if (!project) return 'Projeto não encontrado.';

    try {
      const plan = await this.selah.actionPlan({
        projectName: clip(project.name, 200),
        tasks: project.tasks.map((t) => ({
          title: clip(t.title, 200),
          priority: t.priority,
          assigneeName: t.assignee?.name ?? null,
          dueDateLabel: t.dueDate ? t.dueDate.toLocaleDateString('pt-BR') : null,
        })),
      });
      return formatActionPlan(plan);
    } catch (err) {
      this.fail(err, 'plano de ação');
    }
  }

  async identifyBottlenecks(companyId: string): Promise<string> {
    const ctx      = await this.buildContext(companyId);
    const stagnant = await this.prisma.task.findMany({
      where: {
        project:   { companyId },
        status:    { in: ['IN_PROGRESS', 'IN_REVIEW'] },
        updatedAt: { lt: new Date(Date.now() - 7 * 86_400_000) },
      },
      include: { assignee: { select: { name: true } }, project: { select: { name: true } } },
      take: 10,
    });

    try {
      const analysis = await this.selah.bottlenecks({
        workspace: this.toWorkspacePayload(ctx),
        stagnantTasks: stagnant.map((t) => ({
          title: clip(t.title, 200),
          status: t.status,
          projectName: clip(t.project.name, 200),
          assigneeName: t.assignee?.name ?? null,
        })),
      });
      return formatBottlenecks(analysis);
    } catch (err) {
      this.fail(err, 'gargalos');
    }
  }

  async suggestAssignee(taskId: string): Promise<string> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { project: { include: { team: { include: { members: { include: { user: { select: { id: true, name: true } } } } } } } } },
    });
    if (!task) return 'Tarefa não encontrada.';

    const members = task.project.team?.members ?? [];
    if (members.length === 0) return 'Sem membros na equipe.';

    const workloads = await Promise.all(
      members.map(async (m) => ({
        name:    m.user.name,
        pending: await this.prisma.task.count({ where: { assigneeId: m.user.id, status: { not: 'DONE' } } }),
      })),
    );

    try {
      const suggestions = await this.selah.suggestAssignee({
        taskTitle: clip(task.title, 200),
        taskPriority: task.priority,
        members: workloads.slice(0, 30).map((w) => ({ name: clip(w.name, 120), pendingTasks: w.pending })),
      });
      return formatAssignees(suggestions);
    } catch (err) {
      this.fail(err, 'sugestão de responsável');
    }
  }

  async getConversations(companyId: string, limit = 20) {
    return this.prisma.aiConversation.findMany({
      where: { companyId },
      include: {
        _count:   { select: { messages: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, role: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async getConversation(id: string) {
    return this.prisma.aiConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async generateStrategicBrief(companyId: string): Promise<{
    generatedAt: string;
    summary: string;
    risks: string;
    opportunities: string;
    teamHealth: string;
    recommendations: string;
    metrics: Record<string, any>;
  }> {
    const since30 = new Date(Date.now() - 30 * 86_400_000);

    const [
      totalTasks, doneTasks, overdueTasks, backlogTasks,
      activeProjects, members, recentInsights,
    ] = await Promise.all([
      this.prisma.task.count({ where: { project: { companyId } } }),
      this.prisma.task.count({ where: { project: { companyId }, status: 'DONE' } }),
      this.prisma.task.count({ where: { project: { companyId }, dueDate: { lt: new Date() }, status: { not: 'DONE' } } }),
      this.prisma.task.count({ where: { project: { companyId }, status: 'BACKLOG' } }),
      this.prisma.project.count({ where: { companyId, isArchived: false } }),
      this.prisma.userCompany.count({ where: { companyId } }),
      this.prisma.insight.findMany({
        where: { companyId, isDismissed: false },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: 5,
        select: { type: true, severity: true, title: true, description: true },
      }).catch(() => []),
    ]);

    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const recentDone     = await this.prisma.task.count({ where: { project: { companyId }, status: 'DONE', updatedAt: { gte: since30 } } });
    const weeklyVelocity = Math.round((recentDone / 30) * 7);

    let brief;
    try {
      brief = await this.selah.strategicBrief({
        metrics: { totalTasks, doneTasks, overdueTasks, backlogTasks, activeProjects, members, completionRate, weeklyVelocity },
        insights: recentInsights.map((i) => ({
          severity: String(i.severity),
          title: clip(i.title, 200),
          description: clip(i.description, 600),
        })),
      });
    } catch (err) {
      this.fail(err, 'brief estratégico');
    }

    return {
      generatedAt: new Date().toISOString(),
      summary: brief.summary,
      risks: formatBullets(brief.risks),
      opportunities: formatBullets(brief.opportunities),
      recommendations: formatBullets(brief.recommendations),
      teamHealth: `${members} membros | Velocidade: ${weeklyVelocity} tarefas/semana | Taxa de conclusão: ${completionRate}%`,
      metrics: {
        totalTasks, doneTasks, overdueTasks, backlogTasks,
        activeProjects, members, completionRate, weeklyVelocity,
      },
    };
  }
}
