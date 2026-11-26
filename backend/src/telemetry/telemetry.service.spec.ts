import { TelemetryService } from './telemetry.service';

describe('TelemetryService', () => {
  it('track grava o evento com contexto', async () => {
    const prisma = { productEvent: { create: jest.fn().mockResolvedValue({}) } };
    const svc = new TelemetryService(prisma as any);

    svc.track('invite.accepted', { companyId: 'c1', userId: 'u1' });
    await new Promise((r) => setImmediate(r));

    expect(prisma.productEvent.create).toHaveBeenCalledWith({
      data: { event: 'invite.accepted', companyId: 'c1', userId: 'u1', metadata: undefined },
    });
  });

  it('track nunca derruba a chamada quando o banco falha', async () => {
    const prisma = { productEvent: { create: jest.fn().mockRejectedValue(new Error('banco fora')) } };
    const svc = new TelemetryService(prisma as any);

    expect(() => svc.track('team.created', { companyId: 'c1' })).not.toThrow();
    await new Promise((r) => setImmediate(r)); // o rejection precisa ser capturado, não virar unhandled
  });

  it('logError ignora a segunda vez a mesma assinatura dentro da janela de 60s', async () => {
    const prisma = { errorLog: { create: jest.fn().mockResolvedValue({}) } };
    const svc = new TelemetryService(prisma as any);

    svc.logError({ source: 'SERVER', message: 'boom', path: '/x' });
    svc.logError({ source: 'SERVER', message: 'boom', path: '/x' });
    svc.logError({ source: 'SERVER', message: 'boom', path: '/y' }); // path diferente = assinatura diferente
    await new Promise((r) => setImmediate(r));

    expect(prisma.errorLog.create).toHaveBeenCalledTimes(2);
  });

  it('trunca mensagem e stack antes de gravar', async () => {
    const prisma = { errorLog: { create: jest.fn().mockResolvedValue({}) } };
    const svc = new TelemetryService(prisma as any);

    svc.logError({ source: 'CLIENT', message: 'm'.repeat(5000), stack: 's'.repeat(20000) });
    await new Promise((r) => setImmediate(r));

    const data = prisma.errorLog.create.mock.calls[0][0].data;
    expect(data.message.length).toBe(2000);
    expect(data.stack.length).toBe(8000);
  });

  it('requireAdmin recusa quem não é OWNER/ADMIN', async () => {
    const prisma = { userCompany: { findFirst: jest.fn().mockResolvedValue(null) } };
    const svc = new TelemetryService(prisma as any);

    await expect(svc.requireAdmin('c1', 'u-membro')).rejects.toThrow('Apenas admins veem o diagnóstico');
  });

  it('usageSummary agrega eventos e IA da empresa no período', async () => {
    const prisma = {
      productEvent: { groupBy: jest.fn().mockResolvedValue([{ event: 'team.created', _count: { _all: 2 } }]) },
      aiUsageLog: { groupBy: jest.fn().mockResolvedValue([{ feature: 'chat', _count: { _all: 5 } }]) },
    };
    const svc = new TelemetryService(prisma as any);

    const res = await svc.usageSummary('c1', 30);

    expect(res.events).toHaveLength(1);
    expect(res.ai[0].feature).toBe('chat');
    const eventWhere = prisma.productEvent.groupBy.mock.calls[0][0].where;
    expect(eventWhere.companyId).toBe('c1');
    expect(eventWhere.createdAt.gte.getTime()).toBeLessThan(Date.now());
  });
});
