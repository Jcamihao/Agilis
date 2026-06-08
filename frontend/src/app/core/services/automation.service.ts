import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export type AutomationTrigger = 'TASK_CREATED' | 'TASK_STATUS_CHANGED' | 'TASK_OVERDUE' | 'COMMENT_CREATED' | 'TASK_ASSIGNED';
export type AutomationActionType = 'CHANGE_STATUS' | 'ASSIGN_USER' | 'SEND_NOTIFICATION' | 'CREATE_TASK' | 'SEND_EMAIL' | 'SEND_WHATSAPP' | 'SEND_TELEGRAM';

export interface AutomationCondition { field: string; operator: string; value: any }
export interface AutomationAction    { type: AutomationActionType; params: Record<string, any> }

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  companyId: string;
  projectId?: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  isActive: boolean;
  runCount: number;
  lastRunAt?: string;
  createdAt: string;
  project?: { id: string; name: string; color: string };
  _count?: { executions: number };
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  taskId?: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  result?: any;
  error?: string;
  durationMs?: number;
  createdAt: string;
  task?: { id: string; title: string };
}

@Injectable({ providedIn: 'root' })
export class AutomationService {
  private readonly api = inject(ApiService);

  getAll(companyId: string)          { return this.api.get<AutomationRule[]>('/automation', { companyId }); }
  getOne(id: string)                 { return this.api.get<AutomationRule>(`/automation/${id}`); }
  create(data: Partial<AutomationRule>) { return this.api.post<AutomationRule>('/automation', data); }
  update(id: string, data: Partial<AutomationRule>) { return this.api.put<AutomationRule>(`/automation/${id}`, data); }
  toggle(id: string)                 { return this.api.patch<AutomationRule>(`/automation/${id}/toggle`, {}); }
  delete(id: string)                 { return this.api.delete<AutomationRule>(`/automation/${id}`); }
  getExecutions(id: string)          { return this.api.get<AutomationExecution[]>(`/automation/${id}/executions`); }
}
