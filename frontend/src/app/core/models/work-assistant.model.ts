import { Task, TaskLogAction } from './task.model';

export interface MyFocusToday {
  totalOpen: number;
  dueToday: number;
  delayed: number;
  critical: number;
  tasks: Task[];
}

export interface PrioritySummaryItem {
  label: string;
  total: number;
}

export interface PriorityEngine {
  generatedAt: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  topTasks: Task[];
  summary: PrioritySummaryItem[];
}

export interface CollectionCenterItem {
  task: Task;
  lastActionAt?: string;
  lastActionLabel: string;
  nextStep: string;
}

export interface CollectionCenterEvent {
  id: string;
  taskId: string;
  taskTitle: string;
  action: TaskLogAction;
  description: string;
  createdAt: string;
}

export interface CollectionCenter {
  pendingCharges: number;
  escalatedTasks: number;
  remindersSentToday: number;
  recentEvents: CollectionCenterEvent[];
  items: CollectionCenterItem[];
}

export interface WorkAssistantOverview {
  generatedAt: string;
  myFocusToday: MyFocusToday;
  priorityEngine: PriorityEngine;
  collectionCenter: CollectionCenter;
}
