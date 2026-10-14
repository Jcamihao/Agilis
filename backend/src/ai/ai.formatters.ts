import { SelahActionPlan, SelahBottleneckAnalysis, SelahRedistribution } from './selah-ai-client.service';

const bullets = (items: string[]) => items.map((item) => `• ${item}`).join('\n');

const section = (title: string, items: string[]) =>
  items.length ? `${title}\n${bullets(items)}` : '';

export const formatBullets = bullets;

export const formatActionPlan = (plan: SelahActionPlan) =>
  [
    section('Prioridades imediatas (esta semana)', plan.immediatePriorities),
    section('Próximos passos (próximas 2 semanas)', plan.nextSteps),
    section('Riscos identificados', plan.risks),
    section('Recomendações', plan.recommendations),
  ]
    .filter(Boolean)
    .join('\n\n');

export const formatBottlenecks = (analysis: SelahBottleneckAnalysis) => {
  if (!analysis.bottlenecks.length) {
    return analysis.overview;
  }
  const items = analysis.bottlenecks
    .map((item, index) => `${index + 1}. ${item.title}\n   Causa: ${item.cause}\n   Ação: ${item.correctiveAction}`)
    .join('\n\n');
  return `${analysis.overview}\n\n${items}`;
};

export const formatRedistribution = (redistribution: SelahRedistribution) => {
  if (!redistribution.moves.length) {
    return redistribution.overview;
  }
  const moves = redistribution.moves
    .map(
      (move, index) =>
        `${index + 1}. Mover ${move.tasksToMove} ${move.tasksToMove === 1 ? 'tarefa' : 'tarefas'} de ${move.from} para ${move.to}\n   ${move.reason}`,
    )
    .join('\n\n');
  return `${redistribution.overview}\n\n${moves}`;
};

