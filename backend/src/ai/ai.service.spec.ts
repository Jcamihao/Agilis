import { ServiceUnavailableException } from '@nestjs/common';
import { AiService } from './ai.service';
import { SelahAiError } from './selah-ai-client.service';

const buildPrisma = (overrides: Record<string, any> = {}) =>
  ({
    task: {
      count: jest.fn().mockResolvedValue(10),
      groupBy: jest.fn().mockResolvedValue([{ assigneeId: 'u1', _count: { assigneeId: 3 } }]),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn(),
    },
    project: { count: jest.fn().mockResolvedValue(2), findUnique: jest.fn() },
    team: { count: jest.fn().mockResolvedValue(1) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'u1', name: 'Ana' }]) },
    userCompany: { count: jest.fn().mockResolvedValue(5) },
    insight: { findMany: jest.fn().mockResolvedValue([]) },
    aiConversation: { create: jest.fn().mockResolvedValue({ id: 'conv-1' }) },
    aiMessage: {
      findMany: jest.fn().mockResolvedValue([{ role: 'assistant', content: 'oi' }, { role: 'user', content: 'ola' }]),
      createMany: jest.fn().mockResolvedValue({}),
    },
    aiUsageLog: { create: jest.fn().mockResolvedValue({}) },
    ...overrides,
  }) as any;

const buildSelah = () =>
  ({
    chat: jest.fn().mockResolvedValue('resposta'),
    summarizeProject: jest.fn().mockResolvedValue('resumo do projeto'),
    summarizeTask: jest.fn().mockResolvedValue('resumo da tarefa'),
    actionPlan: jest.fn().mockResolvedValue({ immediatePriorities: ['Fechar login'], nextSteps: [], risks: [], recommendations: [] }),
    bottlenecks: jest.fn().mockResolvedValue({ overview: 'ok', bottlenecks: [] }),
    suggestAssignee: jest.fn().mockResolvedValue([{ name: 'Carla', reason: 'menor carga' }]),
    strategicBrief: jest.fn().mockResolvedValue({ summary: 's', risks: ['r'], opportunities: ['o'], recommendations: ['c'] }),
  }) as any;

describe('AiService (Agilis -> Selah IA)', () => {
  it('chat sends workspace data without the company id and persists both turns', async () => {
    const prisma = buildPrisma();
    const selah = buildSelah();
    const service = new AiService(prisma, selah);

    const result = await service.chat('company-1', 'user-1', 'Como estamos?');

    const payload = selah.chat.mock.calls[0][0];
    expect(payload.message).toBe('Como estamos?');
    expect(payload.workspace.companyId).toBeUndefined();
    expect(payload.workspace.topOverdueUsers).toEqual([{ name: 'Ana', count: 3 }]);
    expect(payload.history).toEqual([
      { role: 'assistant', content: 'oi' },
      { role: 'user', content: 'ola' },
    ]);
    expect(prisma.aiMessage.createMany.mock.calls[0][0].data).toHaveLength(2);
    expect(result).toEqual({ reply: 'resposta', conversationId: 'conv-1' });
  });

  it('chat answers inside the conversation when Selah fails, without saving messages or leaking details', async () => {
    const prisma = buildPrisma();
    const selah = buildSelah();
    selah.chat.mockRejectedValue(new SelahAiError('detalhe interno do upstream', 502));
    const service = new AiService(prisma, selah);

    const result = await service.chat('company-1', 'user-1', 'oi');

    expect(result.reply).toContain('indisponível');
    expect(result.reply).not.toContain('upstream');
    expect(prisma.aiMessage.createMany).not.toHaveBeenCalled();
  });

  it('chat tells the user how long to wait on a rate limit', async () => {
    const selah = buildSelah();
    selah.chat.mockRejectedValue(new SelahAiError('x', 429, 20));

    const result = await new AiService(buildPrisma(), selah).chat('c', 'u', 'oi');

    expect(result.reply).toContain('20s');
  });

  it('summarizes a project from its task counts and overdue titles', async () => {
    const past = new Date(Date.now() - 86_400_000);
    const prisma = buildPrisma();
    prisma.project.findUnique.mockResolvedValue({
      name: 'Site',
      tasks: [
        { status: 'DONE', dueDate: null, title: 'A' },
        { status: 'DOING', dueDate: past, title: 'Login' },
        { status: 'TODO', dueDate: past, title: 'Pagamento' },
      ],
    });
    const selah = buildSelah();

    const summary = await new AiService(prisma, selah).summarizeProject('p1');

    expect(summary).toBe('resumo do projeto');
    expect(selah.summarizeProject).toHaveBeenCalledWith({
      projectName: 'Site',
      totalTasks: 3,
      doneTasks: 1,
      overdueTasks: 2,
      overdueTaskTitles: ['Login', 'Pagamento'],
    });
  });

  it('keeps the friendly not-found answers without calling Selah', async () => {
    const prisma = buildPrisma();
    prisma.project.findUnique.mockResolvedValue(null);
    prisma.task.findUnique.mockResolvedValue(null);
    const selah = buildSelah();
    const service = new AiService(prisma, selah);

    expect(await service.summarizeProject('x')).toBe('Projeto não encontrado.');
    expect(await service.generateActionPlan('x')).toBe('Projeto não encontrado.');
    expect(selah.summarizeProject).not.toHaveBeenCalled();
  });

  it('turns the structured action plan into plain text', async () => {
    const prisma = buildPrisma();
    prisma.project.findUnique.mockResolvedValue({
      name: 'Site',
      tasks: [{ title: 'Login', priority: 'HIGH', dueDate: null, assignee: { name: 'Ana' } }],
    });

    const plan = await new AiService(prisma, buildSelah()).generateActionPlan('p1');

    expect(plan).toBe('Prioridades imediatas (esta semana)\n• Fechar login');
  });

  it('throws 503 with a friendly message on analysis failures so the UI shows its error toast', async () => {
    const prisma = buildPrisma();
    prisma.project.findUnique.mockResolvedValue({ name: 'Site', tasks: [] });
    const selah = buildSelah();
    selah.summarizeProject.mockRejectedValue(new SelahAiError('boom', 500));

    await expect(new AiService(prisma, selah).summarizeProject('p1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('builds the strategic brief with metrics and bullet lists', async () => {
    const brief = await new AiService(buildPrisma(), buildSelah()).generateStrategicBrief('company-1');

    expect(brief.summary).toBe('s');
    expect(brief.risks).toBe('• r');
    expect(brief.metrics.totalTasks).toBe(10);
    expect(brief.teamHealth).toContain('5 membros');
    expect(brief.generatedAt).toBeTruthy();
  });

  it('reports "not configured" clearly when the Selah client has no key', async () => {
    const selah = buildSelah();
    selah.chat.mockRejectedValue(new SelahAiError('nao configurado', 0));

    const result = await new AiService(buildPrisma(), selah).chat('c', 'u', 'oi');

    expect(result.reply).toContain('não está configurado');
  });
});

describe('Medição de custo de IA (F4)', () => {
  it('chat registers one usage log with request/response chars', async () => {
    const prisma = buildPrisma();
    const selah = buildSelah();

    await new AiService(prisma, selah).chat('c-1', 'u-1', 'como está o projeto?');

    expect(prisma.aiUsageLog.create).toHaveBeenCalledTimes(1);
    const data = prisma.aiUsageLog.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ companyId: 'c-1', feature: 'chat' });
    expect(data.requestChars).toBeGreaterThan(0);
    expect(data.responseChars).toBe(JSON.stringify('resposta').length);
  });

  it('a broken usage log never breaks the chat', async () => {
    const prisma = buildPrisma({
      aiUsageLog: { create: jest.fn().mockRejectedValue(new Error('banco fora')) },
    });

    const result = await new AiService(prisma, buildSelah()).chat('c-1', 'u-1', 'oi');

    expect(result.reply).toBe('resposta');
  });

  it('failed Selah calls are not measured (nothing was answered)', async () => {
    const prisma = buildPrisma();
    const selah = buildSelah();
    selah.chat.mockRejectedValue(new SelahAiError('fora do ar', 503));

    await new AiService(prisma, selah).chat('c-1', 'u-1', 'oi');

    expect(prisma.aiUsageLog.create).not.toHaveBeenCalled();
  });

  it('getUsage aggregates by month and blocks non-admins', async () => {
    const now = new Date();
    const prisma = buildPrisma({
      userCompany: { findFirst: jest.fn().mockResolvedValue({ role: 'OWNER' }) },
      aiUsageLog: {
        findMany: jest.fn().mockResolvedValue([
          { feature: 'chat', requestChars: 1000, responseChars: 400, createdAt: now },
          { feature: 'chat', requestChars: 100, responseChars: 100, createdAt: now },
          { feature: 'strategic-brief', requestChars: 2000, responseChars: 800, createdAt: now },
        ]),
      },
    });

    const res = await new AiService(prisma, buildSelah()).getUsage('c-1', 'u-1');

    const month = res.months[0];
    expect(month.calls).toBe(3);
    expect(month.byFeature).toEqual({ chat: 2, 'strategic-brief': 1 });
    expect(month.estimatedTokens).toBe(Math.round((1000 + 400 + 100 + 100 + 2000 + 800) * 0.25));

    const nonAdmin = new AiService(buildPrisma({ userCompany: { findFirst: jest.fn().mockResolvedValue(null) } }), buildSelah());
    await expect(nonAdmin.getUsage('c-1', 'u-x')).rejects.toThrow(/Apenas admins/);
  });
});
