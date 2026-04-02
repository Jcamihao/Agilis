import { TaskLogAction, TaskStatus } from '@prisma/client';
import {
  TaskAutomationResponseDto,
  TaskPriorityResponseDto,
  TaskUserSummaryDto,
} from '../../tasks/dto/task-response.dto';

export class WorkAssistantTaskDto {
  id!: string;
  title!: string;
  description?: string;
  status!: TaskStatus;
  dueDate!: Date;
  assignees!: TaskUserSummaryDto[];
  assignedToAll!: boolean;
  assigneeLabel!: string;
  priority!: TaskPriorityResponseDto;
  automation!: TaskAutomationResponseDto;

  static fromValues(input: WorkAssistantTaskDto): WorkAssistantTaskDto {
    return input;
  }
}

export class MyFocusTodayDto {
  totalOpen!: number;
  dueToday!: number;
  delayed!: number;
  critical!: number;
  tasks!: WorkAssistantTaskDto[];
}

export class PrioritySummaryItemDto {
  label!: string;
  total!: number;
}

export class PriorityEngineDto {
  generatedAt!: Date;
  critical!: number;
  high!: number;
  medium!: number;
  low!: number;
  topTasks!: WorkAssistantTaskDto[];
  summary!: PrioritySummaryItemDto[];
}

export class CollectionCenterItemDto {
  task!: WorkAssistantTaskDto;
  lastActionAt?: Date;
  lastActionLabel!: string;
  nextStep!: string;
}

export class CollectionCenterEventDto {
  id!: string;
  taskId!: string;
  taskTitle!: string;
  action!: TaskLogAction;
  description!: string;
  createdAt!: Date;
}

export class CollectionCenterDto {
  pendingCharges!: number;
  escalatedTasks!: number;
  remindersSentToday!: number;
  recentEvents!: CollectionCenterEventDto[];
  items!: CollectionCenterItemDto[];
}

export class WorkAssistantOverviewDto {
  generatedAt!: Date;
  myFocusToday!: MyFocusTodayDto;
  priorityEngine!: PriorityEngineDto;
  collectionCenter!: CollectionCenterDto;
}
