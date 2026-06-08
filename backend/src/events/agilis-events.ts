import { Task, Comment, User } from '@prisma/client';

// ── Event names ──────────────────────────────────────────────────────────────
export const EVENTS = {
  TASK_CREATED:        'task.created',
  TASK_UPDATED:        'task.updated',
  TASK_STATUS_CHANGED: 'task.status_changed',
  TASK_ASSIGNED:       'task.assigned',
  TASK_OVERDUE:        'task.overdue',
  COMMENT_CREATED:     'comment.created',
} as const;

// ── Payloads ─────────────────────────────────────────────────────────────────
export interface TaskCreatedEvent {
  task: Task;
  actor: Pick<User, 'id' | 'name' | 'email'>;
  companyId: string;
}

export interface TaskStatusChangedEvent {
  task: Task;
  oldStatus: string;
  newStatus: string;
  actor: Pick<User, 'id' | 'name' | 'email'>;
  companyId: string;
}

export interface TaskAssignedEvent {
  task: Task;
  assigneeId: string;
  actor: Pick<User, 'id' | 'name' | 'email'>;
  companyId: string;
}

export interface TaskOverdueEvent {
  task: Task;
  companyId: string;
}

export interface CommentCreatedEvent {
  comment: Comment;
  task: Task;
  actor: Pick<User, 'id' | 'name' | 'email'>;
  companyId: string;
}
