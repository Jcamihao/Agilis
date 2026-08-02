import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Observable, Subject } from 'rxjs';

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface WorkspaceContext {
  companyId: string;
  totalTasks: number;
  overdueTasks: number;
  completedTasks: number;
  activeProjects: number;
  topOverdueUsers: { name: string; count: number }[];
  backlogCount: number;
  teamCount: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ollamaUrl: string;
  private readonly ollamaModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.ollamaUrl   = this.config.get<string>('OLLAMA_URL')   ?? 'http://localhost:11434';
    this.ollamaModel = this.config.get<string>('OLLAMA_MODEL') ?? 'mistral';
    this.logger.log(`AI Provider: Ollama | Model: ${this.ollamaModel} | URL: ${this.ollamaUrl}`);
  }

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

  private buildSystemPrompt(ctx: WorkspaceContext): string {
    return `Você é um assistente de IA integrado ao Agilis, uma plataforma de gestão operacional.

CONTEXTO DO WORKSPACE (dados em tempo real):
- Total de tarefas: ${ctx.totalTasks}
- Tarefas atrasadas: ${ctx.overdueTasks}
- Tarefas concluídas: ${ctx.completedTasks}
- Tarefas em backlog: ${ctx.backlogCount}
- Projetos ativos: ${ctx.activeProjects}
- Equipes: ${ctx.teamCount}
- Taxa de conclusão: ${ctx.totalTasks > 0 ? Math.round((ctx.completedTasks / ctx.totalTasks) * 100) : 0}%
${ctx.topOverdueUsers.length > 0 ? `- Usuários com mais atrasos: ${ctx.topOverdueUsers.map((u) => `${u.name} (${u.count})`).join(', ')}` : ''}

REGRAS:
- Responda sempre em português do Brasil
- Seja direto, objetivo e útil
- Use dados reais do contexto nas respostas
- Formate listas com marcadores quando apropriado`;
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
      const reply = await this.ollamaChat(this.buildSystemPrompt(ctx), history, message);

      await this.prisma.aiMessage.createMany({
        data: [
          { conversationId: convId, role: 'user',      content: message, userId },
          { conversationId: convId, role: 'assistant', content: reply },
        ],
      });

      return { reply, conversationId: convId };
    } catch (err: any) {
      this.logger.error(`Ollama error: ${err.message}`);
      return { reply: `❌ Erro ao processar: ${err.message}`, conversationId: convId! };
    }
  }

  chatStream(companyId: string, userId: string, message: string): Observable<string> {
    const subject = new Subject<string>();

    this.buildContext(companyId).then(async (ctx) => {
      try {
        let fullReply = '';
        await this.ollamaChatStream(this.buildSystemPrompt(ctx), message, (chunk) => {
          fullReply += chunk;
          subject.next(chunk);
        });

        await this.prisma.aiConversation.create({
          data: {
            companyId, userId,
            title: message.slice(0, 60),
            messages: {
              create: [
                { role: 'user',      content: message, userId },
                { role: 'assistant', content: fullReply },
              ],
            },
          },
        });

        subject.complete();
      } catch (err: any) {
        subject.next(`❌ Erro: ${err.message}`);
        subject.complete();
      }
    });

    return subject.asObservable();
  }

  // ── Capabilities ──────────────────────────────────────────────────────────

  async summarizeProject(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { tasks: { include: { assignee: { select: { name: true } } } }, team: { select: { name: true } } },
    });
    if (!project) return 'Projeto não encontrado.';

    const done    = project.tasks.filter((t) => t.status === 'DONE').length;
    const total   = project.tasks.length;
    const overdue = project.tasks.filter((t) => t.dueDate && t.dueDate < new Date() && t.status !== 'DONE');

    return this.simpleCompletion(
      `Resuma o projeto "${project.name}" em 3-4 frases executivas:
- ${total} tarefas no total, ${done} concluídas (${total > 0 ? Math.round((done / total) * 100) : 0}%)
- ${overdue.length} tarefas atrasadas
${overdue.length > 0 ? `- Atrasadas: ${overdue.slice(0, 3).map((t) => t.title).join(', ')}` : ''}`,
    );
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

    const comments = task.comments.length > 0
      ? task.comments.map((c) => `${c.author.name}: ${c.content.slice(0, 100)}`).join('\n')
      : 'Sem comentários.';

    return this.simpleCompletion(
      `Resuma esta tarefa em 2-3 frases:
Título: ${task.title} | Status: ${task.status} | Prioridade: ${task.priority}
Responsável: ${task.assignee?.name ?? 'Sem responsável'}
Comentários:\n${comments}`,
    );
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

    const taskList = project.tasks
      .map((t) => `- ${t.title} [${t.priority}] ${t.assignee ? `(@${t.assignee.name})` : ''} ${t.dueDate ? `vence: ${t.dueDate.toLocaleDateString('pt-BR')}` : ''}`)
      .join('\n');

    return this.simpleCompletion(
      `Crie um plano de ação para o projeto "${project.name}":
${taskList}

## Prioridades Imediatas (esta semana)
## Próximos Passos (próximas 2 semanas)
## Riscos Identificados
## Recomendações`,
      1000,
    );
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

    return this.simpleCompletion(
      `Identifique gargalos operacionais:
- Tarefas atrasadas: ${ctx.overdueTasks}
- Responsáveis com mais atrasos: ${ctx.topOverdueUsers.map((u) => `${u.name} (${u.count})`).join(', ') || 'N/A'}
- Paradas há +7 dias: ${stagnant.map((t) => `"${t.title}" [${t.status}] em ${t.project.name}${t.assignee ? ` (@${t.assignee.name})` : ''}`).join('\n') || 'Nenhuma'}

Liste os 3 principais gargalos e sugira ações corretivas.`,
      800,
    );
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

    return this.simpleCompletion(
      `Sugira o melhor responsável para: "${task.title}" [${task.priority}]
Carga da equipe:\n${workloads.map((w) => `${w.name}: ${w.pending} pendentes`).join('\n')}
Sugira 1-2 pessoas com justificativa.`,
      400,
    );
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

  getProviderInfo() {
    return { provider: 'ollama', model: this.ollamaModel, url: this.ollamaUrl };
  }

  // ── Ollama ────────────────────────────────────────────────────────────────

  private async ollamaChat(
    systemPrompt: string,
    history: { role: string; content: string }[],
    message: string,
  ): Promise<string> {
    const messages: OllamaChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: message },
    ];

    const res = await fetch(`${this.ollamaUrl}/v1/chat/completions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model: this.ollamaModel, messages, stream: false }),
    });

    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);

    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content ?? 'Sem resposta do modelo.';
  }

  private async ollamaChatStream(
    systemPrompt: string,
    message: string,
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    const messages: OllamaChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: message },
    ];

    const res = await fetch(`${this.ollamaUrl}/v1/chat/completions`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ model: this.ollamaModel, messages, stream: true }),
    });

    if (!res.ok || !res.body) throw new Error(`Ollama HTTP ${res.status}`);

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter((l) => l.startsWith('data: '));
      for (const line of lines) {
        const json = line.slice(6).trim();
        if (json === '[DONE]') return;
        try {
          const delta = (JSON.parse(json) as any).choices?.[0]?.delta?.content;
          if (delta) onChunk(delta);
        } catch { /* ignore malformed chunks */ }
      }
    }
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
      activeProjects, members, recentInsights, overdueByUser,
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
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: { project: { companyId }, dueDate: { lt: new Date() }, status: { not: 'DONE' }, assigneeId: { not: null } },
        _count: { assigneeId: true },
        orderBy: { _count: { assigneeId: 'desc' } },
        take: 3,
      }).catch(() => []),
    ]);

    const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const recentDone     = await this.prisma.task.count({ where: { project: { companyId }, status: 'DONE', updatedAt: { gte: since30 } } });
    const weeklyVelocity = Math.round((recentDone / 30) * 7);

    const insightsSummary = recentInsights.length > 0
      ? recentInsights.map((i) => `[${i.severity}] ${i.title}: ${i.description}`).join('\n')
      : 'Nenhum insight crítico no momento.';

    const prompt = `Você é um consultor estratégico sênior. Analise os dados abaixo e gere um brief estratégico executivo em português:

MÉTRICAS:
- Total de tarefas: ${totalTasks} | Concluídas: ${doneTasks} (${completionRate}%)
- Tarefas atrasadas: ${overdueTasks} | Em backlog: ${backlogTasks}
- Projetos ativos: ${activeProjects} | Membros: ${members}
- Velocidade semanal: ${weeklyVelocity} tarefas/semana (últimos 30 dias)

INSIGHTS AUTOMÁTICOS:
${insightsSummary}

Gere uma análise estratégica com 4 seções claramente separadas por "###":
### RESUMO EXECUTIVO
(2-3 frases sobre o estado geral da operação)

### PRINCIPAIS RISCOS
(3 riscos concretos baseados nos dados)

### OPORTUNIDADES
(2-3 oportunidades de melhoria identificadas)

### RECOMENDAÇÕES
(3-4 ações prioritárias com impacto esperado)`;

    const raw = await this.simpleCompletion(prompt, 1200);

    const section = (name: string) => {
      const re = new RegExp(`###\\s*${name}\\s*([\\s\\S]*?)(?=###|$)`, 'i');
      return raw.match(re)?.[1]?.trim() ?? '';
    };

    return {
      generatedAt: new Date().toISOString(),
      summary: section('RESUMO EXECUTIVO'),
      risks: section('PRINCIPAIS RISCOS'),
      opportunities: section('OPORTUNIDADES'),
      recommendations: section('RECOMENDAÇÕES'),
      teamHealth: `${members} membros | Velocidade: ${weeklyVelocity} tarefas/semana | Taxa de conclusão: ${completionRate}%`,
      metrics: {
        totalTasks, doneTasks, overdueTasks, backlogTasks,
        activeProjects, members, completionRate, weeklyVelocity,
      },
    };
  }

  private async simpleCompletion(prompt: string, maxTokens = 600): Promise<string> {
    try {
      return await this.ollamaChat(
        'Você é um assistente especialista em gestão operacional. Responda em português do Brasil de forma concisa e útil.',
        [],
        prompt,
      );
    } catch (err: any) {
      return `Erro ao chamar IA: ${err.message}`;
    }
  }
}
