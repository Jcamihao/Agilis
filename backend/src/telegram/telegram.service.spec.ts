import { TelegramService } from './telegram.service';

function makeService(overrides: { token?: string; prismaUsers?: any[] } = {}) {
  const token = overrides.token ?? 'test-token';
  const users = overrides.prismaUsers ?? [];

  const prisma = {
    user: {
      findMany: jest.fn().mockResolvedValue(users),
    },
  };
  const config = {
    get: jest.fn().mockReturnValue(token),
  };

  return { service: new TelegramService(prisma as any, config as any), prisma };
}

describe('TelegramService', () => {
  describe('sendMessage', () => {
    it('returns false when no bot token is configured', async () => {
      const { service } = makeService({ token: '' });
      const result = await service.sendMessage('123', 'hello');
      expect(result).toBe(false);
    });
  });

  describe('onTaskCreated preference filtering', () => {
    it('does not send when user has taskCreated = false', async () => {
      const { service, prisma } = makeService({
        prismaUsers: [
          {
            telegramChatId: '111',
            notifPreferences: { telegram: { taskCreated: false } },
          },
        ],
      });

      const spy = jest.spyOn(service, 'sendMessage').mockResolvedValue(true);

      await service.onTaskCreated({
        task: { id: 't1', title: 'Task', priority: 'MEDIUM', dueDate: null } as any,
        actor: { id: 'u1', name: 'Alice' } as any,
        companyId: 'c1',
      });

      expect(spy).not.toHaveBeenCalled();
    });

    it('sends when user has no saved preferences (default true)', async () => {
      const { service, prisma } = makeService({
        prismaUsers: [{ telegramChatId: '222', notifPreferences: null }],
      });

      const spy = jest.spyOn(service, 'sendMessage').mockResolvedValue(true);

      await service.onTaskCreated({
        task: { id: 't2', title: 'Task 2', priority: 'HIGH', dueDate: null } as any,
        actor: { id: 'u1', name: 'Bob' } as any,
        companyId: 'c1',
      });

      expect(spy).toHaveBeenCalledWith('222', expect.stringContaining('Task 2'));
    });

    it('sends when taskCreated preference is explicitly true', async () => {
      const { service } = makeService({
        prismaUsers: [
          {
            telegramChatId: '333',
            notifPreferences: { telegram: { taskCreated: true } },
          },
        ],
      });

      const spy = jest.spyOn(service, 'sendMessage').mockResolvedValue(true);

      await service.onTaskCreated({
        task: { id: 't3', title: 'Task 3', priority: 'LOW', dueDate: '2026-08-01' } as any,
        actor: { id: 'u1', name: 'Carol' } as any,
        companyId: 'c1',
      });

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('onTaskAssigned preference filtering', () => {
    it('does not send when user has taskAssigned = false', async () => {
      const { service } = makeService({
        prismaUsers: [
          {
            telegramChatId: '444',
            notifPreferences: { telegram: { taskAssigned: false } },
          },
        ],
      });

      const spy = jest.spyOn(service, 'sendMessage').mockResolvedValue(true);

      await service.onTaskAssigned({
        task: { id: 't4', title: 'Assigned Task' } as any,
        actor: { id: 'u1', name: 'Dave' } as any,
        assigneeId: 'u2',
        companyId: 'c1',
      });

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('getRecentUpdates', () => {
    it('returns empty array when no token', async () => {
      const { service } = makeService({ token: '' });
      const result = await service.getRecentUpdates();
      expect(result).toEqual([]);
    });
  });
});
