import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ClientPortalService } from './client-portal.service';

function makeService(overrides: { portal?: any; tasks?: any[]; members?: any[] } = {}) {
  const existingPortal = overrides.portal !== undefined ? overrides.portal : null;

  const prisma = {
    clientPortal: {
      findUnique: jest.fn().mockResolvedValue(existingPortal),
      create: jest.fn().mockImplementation((args: any) =>
        Promise.resolve({ id: 'new-portal', isEnabled: true, password: null, projectId: args.data.projectId, token: args.data.token, showTeam: false }),
      ),
      update: jest.fn().mockImplementation((args: any) =>
        Promise.resolve({ ...existingPortal, ...args.data }),
      ),
    },
    task: { findMany: jest.fn().mockResolvedValue(overrides.tasks ?? []) },
    projectMember: { findMany: jest.fn().mockResolvedValue(overrides.members ?? []) },
  };

  return { service: new ClientPortalService(prisma as any), prisma };
}

describe('ClientPortalService', () => {
  describe('getOrCreate', () => {
    it('returns existing portal without creating a new one', async () => {
      const existing = { id: 'existing', projectId: 'p1', token: 'abc123' };
      const { service, prisma } = makeService({ portal: existing });

      const result = await service.getOrCreate('p1');

      expect(result).toEqual(existing);
      expect(prisma.clientPortal.create).not.toHaveBeenCalled();
    });

    it('creates portal when one does not exist', async () => {
      const { service, prisma } = makeService({ portal: null });

      await service.getOrCreate('p2');

      expect(prisma.clientPortal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ projectId: 'p2' }),
        }),
      );
    });

    it('generates a non-empty token on creation', async () => {
      const { service, prisma } = makeService({ portal: null });

      await service.getOrCreate('p3');

      const callArg = prisma.clientPortal.create.mock.calls[0][0];
      expect(callArg.data.token).toBeTruthy();
      expect(callArg.data.token.length).toBeGreaterThan(10);
    });
  });

  describe('getPublicPortal', () => {
    it('throws NotFoundException when portal does not exist', async () => {
      const { service } = makeService({ portal: null });

      await expect(service.getPublicPortal('bad-token')).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when portal is disabled', async () => {
      const { service } = makeService({
        portal: { token: 'tok', isEnabled: false, password: null, projectId: 'p1', showTeam: false, project: { id: 'p1', name: 'P' } },
      });

      await expect(service.getPublicPortal('tok')).rejects.toThrow(NotFoundException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const { service } = makeService({
        portal: { token: 'tok', isEnabled: true, password: 'secret', projectId: 'p1', showTeam: false, project: { id: 'p1', name: 'P' } },
      });

      await expect(service.getPublicPortal('tok', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('allows access with correct password', async () => {
      const { service } = makeService({
        portal: { token: 'tok', isEnabled: true, password: 'correct', projectId: 'p1', showTeam: false, project: { id: 'p1', name: 'P', description: null, color: null, icon: null, createdAt: new Date() } },
      });

      const result = await service.getPublicPortal('tok', 'correct');
      expect(result).toBeDefined();
    });

    it('allows access when no password is set', async () => {
      const { service } = makeService({
        portal: { token: 'tok', isEnabled: true, password: null, projectId: 'p1', showTeam: false, project: { id: 'p1', name: 'P', description: null, color: null, icon: null, createdAt: new Date() } },
      });

      const result = await service.getPublicPortal('tok');
      expect(result).toBeDefined();
    });
  });

  describe('regenerateToken', () => {
    it('produces a different token each time', async () => {
      const { service, prisma } = makeService({
        portal: { id: 'p1', projectId: 'p1', token: 'old-token' },
      });

      await service.regenerateToken('p1');
      const newToken = prisma.clientPortal.update.mock.calls[0][0].data.token;

      expect(newToken).not.toBe('old-token');
      expect(newToken.length).toBeGreaterThan(10);
    });
  });
});
