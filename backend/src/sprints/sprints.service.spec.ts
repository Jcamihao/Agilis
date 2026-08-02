import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { SprintsService } from './sprints.service';

function makePrisma(overrides: {
  project?: any;
  sprint?: any;
  membership?: any;
} = {}) {
  return {
    project: {
      findUnique: jest.fn().mockResolvedValue(
        overrides.project !== undefined ? overrides.project : { id: 'p1', companyId: 'c1' },
      ),
    },
    sprint: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(
        overrides.sprint !== undefined
          ? overrides.sprint
          : { id: 's1', project: { companyId: 'c1' } },
      ),
      create: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: 'new-sprint', ...args.data })),
      update: jest.fn().mockImplementation((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
    },
    userCompany: {
      findFirst: jest.fn().mockResolvedValue(
        overrides.membership !== undefined ? overrides.membership : { id: 'm1' },
      ),
    },
  };
}

describe('SprintsService', () => {
  describe('findByProject', () => {
    it('throws NotFoundException when project does not exist', async () => {
      const prisma = makePrisma({ project: null });
      const service = new SprintsService(prisma as any);

      await expect(service.findByProject('missing', 'u1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user has no access', async () => {
      const prisma = makePrisma({ membership: null });
      const service = new SprintsService(prisma as any);

      await expect(service.findByProject('p1', 'u-no-access')).rejects.toThrow(ForbiddenException);
    });

    it('returns sprints when user has access', async () => {
      const prisma = makePrisma();
      prisma.sprint.findMany.mockResolvedValue([{ id: 's1', name: 'Sprint 1' }]);
      const service = new SprintsService(prisma as any);

      const result = await service.findByProject('p1', 'u1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sprint 1');
    });
  });

  describe('create', () => {
    it('throws NotFoundException when project not found', async () => {
      const prisma = makePrisma({ project: null });
      const service = new SprintsService(prisma as any);

      await expect(
        service.create({ projectId: 'missing', name: 'Sprint X' } as any, 'u1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates sprint with correct data', async () => {
      const prisma = makePrisma();
      const service = new SprintsService(prisma as any);

      await service.create(
        { projectId: 'p1', name: 'Sprint 1', goal: 'Finish auth', startDate: '2026-07-01', endDate: '2026-07-14' } as any,
        'u1',
      );

      expect(prisma.sprint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Sprint 1', goal: 'Finish auth', projectId: 'p1' }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException when sprint does not exist', async () => {
      const prisma = makePrisma({ sprint: null });
      const service = new SprintsService(prisma as any);

      await expect(service.updateStatus('missing', 'ACTIVE' as any, 'u1')).rejects.toThrow(NotFoundException);
    });

    it('updates sprint status', async () => {
      const prisma = makePrisma();
      const service = new SprintsService(prisma as any);

      await service.updateStatus('s1', 'COMPLETED' as any, 'u1');

      expect(prisma.sprint.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 's1' }, data: { status: 'COMPLETED' } }),
      );
    });
  });
});
