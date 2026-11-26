import { InsightsService } from './insights.service';

function generatePrisma(opts: { dueWeek?: { assigneeId: string | null; _count: { _all: number } }[] } = {}) {
  const findMany = jest
    .fn()
    .mockResolvedValueOnce([]) // overdue
    .mockResolvedValueOnce([]) // stagnant
    .mockResolvedValueOnce([]); // unassignedUrgent
  const prisma = {
    task: {
      findMany,
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue(opts.dueWeek ?? []),
    },
    project: { findMany: jest.fn().mockResolvedValue([]) },
    user: {
      findMany: jest.fn().mockResolvedValue([{ id: 'u1', name: 'Ana' }]),
    },
    insight: {
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  return prisma;
}

describe('InsightsService', () => {
  it('flags a DEADLINE_CONFLICT when one person has 3+ tasks due this week', async () => {
    const prisma = generatePrisma({ dueWeek: [{ assigneeId: 'u1', _count: { _all: 4 } }] });
    const service = new InsightsService(prisma as any);

    await service.generate('company-1');

    const { data } = prisma.insight.createMany.mock.calls[0][0];
    const conflict = data.find((i: any) => i.type === 'DEADLINE_CONFLICT');
    expect(conflict).toBeDefined();
    expect(conflict.title).toContain('Ana');
    expect(conflict.title).toContain('4');
    expect(conflict.severity).toBe('HIGH');
    expect(conflict.entityId).toBe('u1');
    // 3 a 4 = HIGH; sem ACHIEVEMENT junto quando existe insight real
    expect(data.filter((i: any) => i.type === 'ACHIEVEMENT')).toHaveLength(0);
  });

  it('escalates DEADLINE_CONFLICT to CRITICAL at 5+ tasks and ignores pairs with fewer', async () => {
    const prisma = generatePrisma({
      dueWeek: [
        { assigneeId: 'u1', _count: { _all: 5 } },
        { assigneeId: 'u2', _count: { _all: 2 } },
        { assigneeId: null, _count: { _all: 9 } },
      ],
    });
    const service = new InsightsService(prisma as any);

    await service.generate('company-1');

    const { data } = prisma.insight.createMany.mock.calls[0][0];
    const conflicts = data.filter((i: any) => i.type === 'DEADLINE_CONFLICT');
    expect(conflicts).toHaveLength(1); // só o da Ana; u2 tem 2 (abaixo do limiar), null é ignorado
    expect(conflicts[0].severity).toBe('CRITICAL');
    expect(conflicts[0].metadata).toEqual({ count: 5, affected: 1 });
  });

  it('falls back to ACHIEVEMENT when nobody is crowded', async () => {
    const prisma = generatePrisma({ dueWeek: [{ assigneeId: 'u1', _count: { _all: 2 } }] });
    const service = new InsightsService(prisma as any);

    await service.generate('company-1');

    const { data } = prisma.insight.createMany.mock.calls[0][0];
    expect(data.every((i: any) => i.type === 'ACHIEVEMENT')).toBe(true);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('lists only active insights', async () => {
    const prisma = {
      insight: {
        findMany: jest.fn().mockResolvedValue([{ id: 'insight-1' }]),
      },
    };
    const service = new InsightsService(prisma as any);

    const result = await service.list('company-1');

    expect(result).toEqual([{ id: 'insight-1' }]);
    expect(prisma.insight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          isDismissed: false,
        }),
      }),
    );
  });
});
