import { InsightsService } from './insights.service';

describe('InsightsService', () => {
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
