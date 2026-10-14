import { formatActionPlan, formatBottlenecks, formatBullets, formatRedistribution } from './ai.formatters';

describe('ai formatters (texto simples, a tela usa whitespace-pre-wrap)', () => {
  it('formats the action plan by section and skips empty ones', () => {
    const text = formatActionPlan({
      immediatePriorities: ['Fechar login'],
      nextSteps: [],
      risks: ['Prazo curto'],
      recommendations: ['Priorizar pagamentos', 'Revisar carga'],
    });

    expect(text).toBe(
      'Prioridades imediatas (esta semana)\n• Fechar login\n\nRiscos identificados\n• Prazo curto\n\nRecomendações\n• Priorizar pagamentos\n• Revisar carga',
    );
    expect(text).not.toContain('Próximos passos');
    expect(text).not.toContain('##');
  });

  it('formats bottlenecks with cause and action, or just the overview when there are none', () => {
    expect(
      formatBottlenecks({
        overview: 'Fluxo travado.',
        bottlenecks: [{ title: 'Revisão', cause: 'Poucos revisores', correctiveAction: 'Dividir revisões' }],
      }),
    ).toBe('Fluxo travado.\n\n1. Revisão\n   Causa: Poucos revisores\n   Ação: Dividir revisões');
    expect(formatBottlenecks({ overview: 'Tudo certo.', bottlenecks: [] })).toBe('Tudo certo.');
  });

  it('formats bullet lists', () => {
    expect(formatBullets(['a', 'b'])).toBe('• a\n• b');
  });

  it('formats redistribution moves with singular/plural, or just the overview when there are none', () => {
    expect(
      formatRedistribution({
        overview: 'Carga concentrada.',
        moves: [
          { from: 'Ana', to: 'Carla', tasksToMove: 1, reason: 'Menor carga.' },
          { from: 'Ana', to: 'Bruno', tasksToMove: 3, reason: 'Folga.' },
        ],
      }),
    ).toBe(
      'Carga concentrada.\n\n1. Mover 1 tarefa de Ana para Carla\n   Menor carga.\n\n2. Mover 3 tarefas de Ana para Bruno\n   Folga.',
    );
    expect(formatRedistribution({ overview: 'Equipe no limite.', moves: [] })).toBe('Equipe no limite.');
  });
});
