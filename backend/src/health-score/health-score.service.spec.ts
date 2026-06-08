import { HealthScoreService } from './health-score.service';

describe('HealthScoreService', () => {
  it('classifies score labels', () => {
    const service = new HealthScoreService({} as any);

    expect(service.getLabel(90)).toBe('Excelente');
    expect(service.getLabel(75)).toBe('Bom');
    expect(service.getLabel(55)).toBe('Regular');
    expect(service.getLabel(35)).toBe('Crítico');
    expect(service.getLabel(10)).toBe('Alerta Máximo');
  });

  it('keeps score colors aligned with risk bands', () => {
    const service = new HealthScoreService({} as any);

    expect(service.getColor(90)).toBe('#10b981');
    expect(service.getColor(75)).toBe('#3b82f6');
    expect(service.getColor(55)).toBe('#f59e0b');
    expect(service.getColor(35)).toBe('#ef4444');
    expect(service.getColor(10)).toBe('#7f1d1d');
  });
});
