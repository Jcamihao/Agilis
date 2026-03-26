import { User, UserRole } from './user.model';

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'DELAYED';
export type TaskLogAction =
  | 'CREATED'
  | 'STATUS_CHANGED'
  | 'AUTO_DELAYED'
  | 'AUTO_REMINDER_SENT'
  | 'AUTO_ESCALATED';
export type TaskPriorityLabel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface TaskUserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface TaskLog {
  id: string;
  action: TaskLogAction;
  description: string;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
  performedBy?: TaskUserSummary;
  createdAt: string;
}

export interface TaskPriority {
  label: TaskPriorityLabel;
  score: number;
  reasons: string[];
  recommendedAction: string;
}

export interface TaskAutomation {
  reminderCount: number;
  escalationLevel: number;
  lastStatusChangeAt: string;
  lastReminderAt?: string;
  lastEscalationAt?: string;
  idleHours: number;
  overdueHours: number;
  dueInHours: number;
  pendingReminder: boolean;
  pendingEscalationLevel: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate: string;
  organizationId: string;
  assignedTo: TaskUserSummary;
  createdBy: TaskUserSummary;
  logs: TaskLog[];
  priority: TaskPriority;
  automation: TaskAutomation;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  dueDate: string;
  assignedToId: string;
}

export interface UpdateTaskStatusPayload {
  status: TaskStatus;
}

export interface TaskStatusOption {
  key: TaskStatus;
  label: string;
  accent: string;
}

export interface PlannerGroup {
  title: string;
  description: string;
  tasks: Task[];
}
