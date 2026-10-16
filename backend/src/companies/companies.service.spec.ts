import { CompaniesService } from './companies.service';

const DAY = 86_400_000;

const build = (doneRecently: { updatedAt: Date }[]) => {
  const prisma: any = {
    userCompany: { findFirst: jest.fn().mockResolvedValue({ id: 'm1' }) },
    task: {
      count: jest.fn().mockResolvedValue(3),
      findMany: jest.fn().mockResolvedValue(doneRecently),
    },
    project: { count: jest.fn().mockResolvedValue(2) },
    activity: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'u1', name: 'Ana', avatarUrl: null, _count: { assignedTasks: 4 } }]) },
  };
  return { service: new CompaniesService(prisma), prisma };
};

describe('CompaniesService.getDashboardStats', () => {
  it('returns the stat cards plus a 7-day productivity series and the team workload', async () => {
    const today = new Date();
    const { service } = build([{ updatedAt: today }, { updatedAt: today }, { updatedAt: new Date(Date.now() - 2 * DAY) }]);

    const stats = await service.getDashboardStats('c1', 'u1');

    expect(stats).toMatchObject({ totalTasks: 3, completedTasks: 3, overdueTasks: 3, activeProjects: 2 });
    expect(stats.productivity).toHaveLength(7);
    expect(stats.productivity.map((d) => d.date)).toEqual([...stats.productivity.map((d) => d.date)].sort());
    expect(stats.productivity.at(-1)).toEqual({ date: today.toISOString().slice(0, 10), count: 2 });
    expect(stats.productivity.reduce((sum, d) => sum + d.count, 0)).toBe(3);
    expect(stats.teamWorkload).toEqual([{ id: 'u1', name: 'Ana', avatarUrl: null, _count: { assignedTasks: 4 } }]);
  });

  it('fills days without completions with zero', async () => {
    const { service } = build([]);

    const stats = await service.getDashboardStats('c1', 'u1');

    expect(stats.productivity.every((d) => d.count === 0)).toBe(true);
  });

  it('refuses users that are not members of the company', async () => {
    const { service, prisma } = build([]);
    prisma.userCompany.findFirst.mockResolvedValue(null);

    await expect(service.getDashboardStats('c1', 'intruso')).rejects.toThrow('Sem acesso');
  });
});
