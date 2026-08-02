import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface SlaSummary {
  total:                number;
  breached:             number;
  breachRate:           number;
  resolved:             number;
  avgResponseMinutes:   number | null;
  avgResolutionMinutes: number | null;
  avgDelayMinutes:      number | null;
}

export interface SlaBreached {
  id:                string;
  taskId:            string;
  isBreached:        boolean;
  delayMinutes:      number | null;
  resolutionMinutes: number | null;
  responseMinutes:   number | null;
  resolvedAt:        string | null;
  task: {
    id:       string;
    title:    string;
    dueDate:  string | null;
    priority: string;
    assignee: { id: string; name: string; avatarUrl: string | null } | null;
    project:  { id: string; name: string; color: string | null };
  };
}

@Injectable({ providedIn: 'root' })
export class SlaService {
  private readonly api = inject(ApiService);

  summary(companyId: string) {
    return this.api.get<SlaSummary>(`/sla/summary?companyId=${companyId}`);
  }

  breached(companyId: string) {
    return this.api.get<SlaBreached[]>(`/sla/breached?companyId=${companyId}`);
  }

  forTask(taskId: string) {
    return this.api.get<any>(`/sla/task/${taskId}`);
  }

  formatMinutes(min: number | null): string {
    if (min === null) return '—';
    if (min < 60)  return `${min}min`;
    if (min < 1440) return `${Math.round(min / 60)}h`;
    return `${Math.round(min / 1440)}d`;
  }
}
