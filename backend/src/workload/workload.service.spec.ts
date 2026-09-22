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
