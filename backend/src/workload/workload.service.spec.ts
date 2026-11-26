import { WorkloadService } from './workload.service';
import { SelahAiError } from '../ai/selah-ai-client.service';

const member = (name: string, status: string, total: number, overdue: number, capacityScore: number) => ({
  user: { id: name, name, avatarUrl: null },
  total,
  overdue,
  status,
  capacityScore,
});

const build = (members: any[], selah: any) => {
  const service = new WorkloadService({} as any, selah);
  jest.spyOn(service, 'getCompanyWorkload').mockResolvedValue({ members } as any);
  return service;
};

describe('WorkloadService.suggestRedistribution (via Selah IA)', () => {
  it('does not call Selah when nobody is overloaded', async () => {
    const selah = { workloadRedistribution: jest.fn() };

    const result = await build([member('Ana', 'balanced', 3, 0, 40)], selah).suggestRedistribution('c1');

    expect(result.suggestion).toContain('equilibrada');
    expect(selah.workloadRedistribution).not.toHaveBeenCalled();
  });

  it('sends overloaded and available members and returns the formatted suggestion with counts', async () => {
    const selah = {
      workloadRedistribution: jest.fn().mockResolvedValue({
        overview: 'Ana concentra a carga.',
        moves: [{ from: 'Ana', to: 'Carla', tasksToMove: 2, reason: 'Ana tem 3 atrasadas.' }],
      }),
    };
    const service = build(
      [member('Ana', 'overloaded', 8, 3, 95), member('Carla', 'idle', 1, 0, 10), member('Bruno', 'busy', 6, 1, 70)],
      selah,
    );

    const result = await service.suggestRedistribution('c1');

    expect(selah.workloadRedistribution).toHaveBeenCalledWith({
      overloaded: [{ name: 'Ana', openTasks: 8, overdueTasks: 3, capacityScore: 95 }],
      available: [{ name: 'Carla', openTasks: 1, overdueTasks: 0, capacityScore: 10 }],
    });
    expect(result.suggestion).toBe(
      'Ana concentra a carga.\n\n1. Mover 2 tarefas de Ana para Carla\n   Ana tem 3 atrasadas.',
    );
    expect(result.overloaded).toBe(1);
    expect(result.available).toBe(1);
  });

  it('keeps the friendly text (and the counts) when Selah fails', async () => {
    const selah = { workloadRedistribution: jest.fn().mockRejectedValue(new SelahAiError('boom', 502)) };

    const result = await build([member('Ana', 'overloaded', 8, 3, 95)], selah).suggestRedistribution('c1');

    expect(result.suggestion).toBe('Não foi possível gerar sugestão de IA no momento.');
    expect(result.overloaded).toBe(1);
  });
});

// Helper com mesma aritmética do serviço (meia-noite local → rótulo ISO), para não depender do fuso do CI.
const isoOf = (d: Date) => d.toISOString().slice(0, 10);

describe('WorkloadService.getCompanyWorkload — navegação de semana (?weekStart)', () => {
  const prismaFor = (dueDates: Date[]) => ({
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'u1', name: 'Ana', avatarUrl: null }]) },
    task: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue(dueDates.map((dueDate) => ({ dueDate }))),
    },
    timeEntry: { aggregate: jest.fn().mockResolvedValue({ _sum: { durationMin: 0 } }) },
  });
  const service = (prisma: any) =>
    new WorkloadService(prisma, { workloadRedistribution: jest.fn() } as any);

  it('ancora a grade de 14 dias e a semana de tempo registrado no weekStart pedido', async () => {
    const first = new Date('2026-12-07T00:00:00'); // parse local, como o serviço
    const prisma = prismaFor([new Date('2026-12-09T15:30:00')]);

    const res = await service(prisma).getCompanyWorkload('c1', undefined, '2026-12-07');

    const load = res.members[0].dailyLoad;
    expect(load).toHaveLength(14);
    expect(load[0].date).toBe(isoOf(first));
    expect(res.weekStart).toBe(isoOf(first));
    const day2 = load.find((d) => d.date === isoOf(new Date('2026-12-09T00:00:00')));
    expect(day2?.count).toBe(1);

    const grid = prisma.task.findMany.mock.calls[0][0].where.dueDate;
    expect(grid.gte.getTime()).toBe(first.getTime());
    expect(grid.lt.getTime()).toBe(first.getTime() + 14 * 86_400_000);

    const tracked = prisma.timeEntry.aggregate.mock.calls[0][0].where.startedAt;
    expect(tracked.gte.getTime()).toBe(first.getTime());
    expect(tracked.lt.getTime()).toBe(first.getTime() + 7 * 86_400_000);
  });

  it('volta para a janela de hoje quando o weekStart é inválido', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const prisma = prismaFor([]);

    const res = await service(prisma).getCompanyWorkload('c1', undefined, '2027-13-99');

    expect(res.members[0].dailyLoad[0].date).toBe(isoOf(today));
    const grid = prisma.task.findMany.mock.calls[0][0].where.dueDate;
    expect(grid.gte.getTime()).toBe(today.getTime());
    // sem weekStart válido, tempo registrado volta a ser a janela móvel de 7 dias
    const tracked = prisma.timeEntry.aggregate.mock.calls[0][0].where.startedAt;
    expect(Math.abs(tracked.lt.getTime() - Date.now())).toBeLessThan(5_000);
  });
});
