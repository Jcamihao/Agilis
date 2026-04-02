import { TaskLogAction, TaskStatus } from '@prisma/client';

export type TaskPriorityLabel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TaskInsightLog {
  action: TaskLogAction;
  description: string;
  createdAt: Date;
}

export interface TaskInsightSource {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: Date;
  createdAt: Date;
  logs: TaskInsightLog[];
}

export interface TaskAutomationSnapshot {
  reminderCount: number;
  escalationLevel: number;
  lastStatusChangeAt: Date;
  lastReminderAt?: Date;
  lastEscalationAt?: Date;
  idleHours: number;
  overdueHours: number;
  dueInHours: number;
  pendingReminder: boolean;
  pendingEscalationLevel: number;
}

export interface TaskPrioritySnapshot {
  label: TaskPriorityLabel;
  score: number;
  reasons: string[];
  recommendedAction: string;
}

const STATUS_CHANGE_ACTIONS: TaskLogAction[] = [
  TaskLogAction.CREATED,
  TaskLogAction.STATUS_CHANGED,
  TaskLogAction.AUTO_DELAYED,
];

function getElapsedHours(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / (1000 * 60 * 60));
}

function getHoursUntil(date: Date, now: Date): number {
  return (date.getTime() - now.getTime()) / (1000 * 60 * 60);
}

function getLatestLogDate(
  logs: TaskInsightLog[],
  action: TaskLogAction,
): Date | undefined {
  return logs.find((log) => log.action === action)?.createdAt;
}

function getReminderCooldownHours(
  task: Pick<TaskInsightSource, 'status'>,
  priority: Pick<TaskPrioritySnapshot, 'label'>,
): number {
  if (task.status === TaskStatus.DELAYED || priority.label === 'CRITICAL') {
    return 6;
  }

  if (priority.label === 'HIGH') {
    return 12;
  }

  return 18;
}

function getDesiredEscalationLevel(
  task: Pick<TaskInsightSource, 'status'>,
  automation: Pick<
    TaskAutomationSnapshot,
    'overdueHours' | 'idleHours' | 'reminderCount' | 'escalationLevel'
  >,
  priority: Pick<TaskPrioritySnapshot, 'label'>,
): number {
  if (task.status === TaskStatus.DONE) {
    return 0;
  }

  if (
    automation.overdueHours >= 24 ||
    automation.reminderCount >= 3 ||
    ((priority.label === 'CRITICAL' || priority.label === 'HIGH') &&
      automation.idleHours >= 48)
  ) {
    return 2;
  }

  if (
    automation.overdueHours >= 6 ||
    automation.reminderCount >= 2 ||
    ((priority.label === 'CRITICAL' || priority.label === 'HIGH') &&
      automation.idleHours >= 24)
  ) {
    return 1;
  }

  return 0;
}

export function buildTaskPrioritySnapshot(
  task: TaskInsightSource,
  now = new Date(),
  existingAutomation?: Omit<
    TaskAutomationSnapshot,
    'pendingReminder' | 'pendingEscalationLevel'
  >,
): TaskPrioritySnapshot {
  if (task.status === TaskStatus.DONE) {
    return {
      label: 'LOW',
      score: 0,
      reasons: ['Ja concluida e fora da fila de execucao.'],
      recommendedAction: 'Sem acao imediata. Use apenas como referencia historica.',
    };
  }

  const automation =
    existingAutomation ??
    buildTaskAutomationSnapshot(task, now, {
      pendingEscalationLevel: 0,
      pendingReminder: false,
    });
  const reasons: string[] = [];
  let score = 0;

  if (automation.overdueHours > 0 || task.status === TaskStatus.DELAYED) {
    score += 85;
    reasons.push('Prazo estourado e exige resposta imediata.');
  } else if (automation.dueInHours <= 4) {
    score += 65;
    reasons.push('Vence nas proximas 4 horas.');
  } else if (automation.dueInHours <= 24) {
    score += 45;
    reasons.push('Vence ainda hoje ou nas proximas 24 horas.');
  } else if (automation.dueInHours <= 72) {
    score += 20;
    reasons.push('Prazo se aproxima nos proximos 3 dias.');
  }

  if (task.status === TaskStatus.IN_PROGRESS) {
    score += 15;
    reasons.push('Ja foi iniciada e pede continuidade para nao perder ritmo.');
  }

  if (automation.idleHours >= 48) {
    score += 35;
    reasons.push('Sem atualizacao operacional ha mais de 48 horas.');
  } else if (automation.idleHours >= 24) {
    score += 20;
    reasons.push('Sem atualizacao operacional ha mais de 24 horas.');
  }

  if (automation.reminderCount > 0) {
    score += Math.min(24, automation.reminderCount * 8);
    reasons.push('Ja precisou de cobranca automatica.');
  }

  if (automation.escalationLevel > 0) {
    score += automation.escalationLevel * 18;
    reasons.push('Ja entrou em escalonamento para a lideranca.');
  }

  const label: TaskPriorityLabel =
    score >= 100 ? 'CRITICAL' : score >= 65 ? 'HIGH' : score >= 30 ? 'MEDIUM' : 'LOW';

  let recommendedAction = 'Manter acompanhada no Kanban.';

  if (automation.overdueHours > 0 || task.status === TaskStatus.DELAYED) {
    recommendedAction = 'Retomar agora e renegociar prazo, se necessario.';
  } else if (automation.escalationLevel > 0) {
    recommendedAction = 'Responder a cobranca, atualizar o status e remover bloqueios hoje.';
  } else if (automation.dueInHours <= 24) {
    recommendedAction = 'Puxar para execucao hoje para evitar atraso.';
  } else if (automation.idleHours >= 24) {
    recommendedAction = 'Atualizar andamento e dar visibilidade ao proximo passo.';
  }

  return {
    label,
    score,
    reasons,
    recommendedAction,
  };
}

export function buildTaskAutomationSnapshot(
  task: TaskInsightSource,
  now = new Date(),
  defaults: Pick<TaskAutomationSnapshot, 'pendingReminder' | 'pendingEscalationLevel'> = {
    pendingReminder: false,
    pendingEscalationLevel: 0,
  },
): TaskAutomationSnapshot {
  const logs = [...task.logs].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
  );
  const lastStatusChangeAt =
    logs.find((log) => STATUS_CHANGE_ACTIONS.includes(log.action))?.createdAt ??
    task.createdAt;
  const reminderLogs = logs.filter(
    (log) => log.action === TaskLogAction.AUTO_REMINDER_SENT,
  );
  const escalationLogs = logs.filter(
    (log) => log.action === TaskLogAction.AUTO_ESCALATED,
  );
  const lastReminderAt = getLatestLogDate(logs, TaskLogAction.AUTO_REMINDER_SENT);
  const lastEscalationAt = getLatestLogDate(logs, TaskLogAction.AUTO_ESCALATED);
  const overdueHours = Math.max(0, getElapsedHours(task.dueDate, now));
  const dueInHours = getHoursUntil(task.dueDate, now);
  const idleHours = getElapsedHours(lastStatusChangeAt, now);

  return {
    reminderCount: reminderLogs.length,
    escalationLevel: Math.min(2, escalationLogs.length),
    lastStatusChangeAt,
    lastReminderAt,
    lastEscalationAt,
    idleHours,
    overdueHours,
    dueInHours,
    pendingReminder: defaults.pendingReminder,
    pendingEscalationLevel: defaults.pendingEscalationLevel,
  };
}

export function buildTaskOperationalSnapshot(
  task: TaskInsightSource,
  now = new Date(),
): { automation: TaskAutomationSnapshot; priority: TaskPrioritySnapshot } {
  const baseAutomation = buildTaskAutomationSnapshot(task, now, {
    pendingReminder: false,
    pendingEscalationLevel: 0,
  });
  const priority = buildTaskPrioritySnapshot(task, now, baseAutomation);
  const cooldownHours = getReminderCooldownHours(task, priority);
  const hoursSinceLastReminder = baseAutomation.lastReminderAt
    ? getElapsedHours(baseAutomation.lastReminderAt, now)
    : Number.POSITIVE_INFINITY;
  const hoursSinceLastEscalation = baseAutomation.lastEscalationAt
    ? getElapsedHours(baseAutomation.lastEscalationAt, now)
    : Number.POSITIVE_INFINITY;
  const pendingReminder =
    task.status !== TaskStatus.DONE &&
    (task.status === TaskStatus.DELAYED ||
      priority.label === 'CRITICAL' ||
      priority.label === 'HIGH' ||
      baseAutomation.dueInHours <= 24) &&
    hoursSinceLastReminder >= cooldownHours;
  const desiredEscalationLevel = getDesiredEscalationLevel(task, baseAutomation, priority);
  const pendingEscalationLevel =
    desiredEscalationLevel > baseAutomation.escalationLevel && hoursSinceLastEscalation >= 12
      ? 1
      : 0;

  return {
    priority,
    automation: {
      ...baseAutomation,
      pendingReminder,
      pendingEscalationLevel,
    },
  };
}

export function compareTasksByPriority(
  left: TaskInsightSource,
  right: TaskInsightSource,
  now = new Date(),
): number {
  const leftSnapshot = buildTaskOperationalSnapshot(left, now);
  const rightSnapshot = buildTaskOperationalSnapshot(right, now);

  if (rightSnapshot.priority.score !== leftSnapshot.priority.score) {
    return rightSnapshot.priority.score - leftSnapshot.priority.score;
  }

  return left.dueDate.getTime() - right.dueDate.getTime();
}
