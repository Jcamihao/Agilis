import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface DailyLoad { date: string; count: number; }

export interface MemberWorkload {
  user: { id: string; name: string; avatarUrl: string | null };
  total: number;
  overdue: number;
  dueSoon: number;
  inProgress: number;
  backlog: number;
  done: number;
  trackedMinThisWeek: number;
  capacityScore: number;
  status: 'idle' | 'balanced' | 'busy' | 'overloaded';
  dailyLoad: DailyLoad[];
}

export interface WorkloadOverview {
  members: MemberWorkload[];
  totalTasks: number;
  avgCapacity: number;
  overloaded: number;
  idle: number;
}

@Injectable({ providedIn: 'root' })
export class WorkloadService {
  private readonly api = inject(ApiService);

  get(projectId?: string) {
    return this.api.get<WorkloadOverview>('/workload', projectId ? { projectId } : {});
  }

  suggest() {
    return this.api.post<{ suggestion: string; overloaded: number; available: number }>('/workload/suggest', {});
  }
}
