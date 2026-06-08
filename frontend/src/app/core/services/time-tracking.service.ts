import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface TimeEntry {
  id: string;
  taskId: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  durationMin?: number;
  description?: string;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string };
}

export interface TaskTimeLog {
  entries: TimeEntry[];
  totalMin: number;
  activeTimer: TimeEntry | null;
}

export interface ProjectTimeReport {
  totalMin: number;
  byTask: { task: { id: string; title: string; status: string }; entries: TimeEntry[]; totalMin: number }[];
  byUser: { user: { id: string; name: string; avatarUrl?: string }; totalMin: number }[];
  recentEntries: TimeEntry[];
}

@Injectable({ providedIn: 'root' })
export class TimeTrackingService {
  private readonly api = inject(ApiService);

  startTimer(taskId: string, description?: string) {
    return this.api.post<TimeEntry>(`/time-tracking/tasks/${taskId}/start`, { description });
  }

  stopTimer(taskId: string, description?: string) {
    return this.api.post<TimeEntry>(`/time-tracking/tasks/${taskId}/stop`, { description });
  }

  addManual(taskId: string, durationMin: number, description?: string, startedAt?: string) {
    return this.api.post<TimeEntry>(`/time-tracking/tasks/${taskId}/manual`, { durationMin, description, startedAt });
  }

  listByTask(taskId: string) {
    return this.api.get<TaskTimeLog>(`/time-tracking/tasks/${taskId}`);
  }

  getActiveTimer(taskId: string) {
    return this.api.get<TimeEntry | null>(`/time-tracking/tasks/${taskId}/active`);
  }

  updateEntry(id: string, data: { durationMin?: number; description?: string }) {
    return this.api.patch<TimeEntry>(`/time-tracking/entries/${id}`, data);
  }

  deleteEntry(id: string) {
    return this.api.delete<void>(`/time-tracking/entries/${id}`);
  }

  projectReport(projectId: string) {
    return this.api.get<ProjectTimeReport>(`/time-tracking/projects/${projectId}/report`);
  }

  myLog(companyId?: string) {
    return this.api.get<TimeEntry[]>('/time-tracking/my-log', companyId ? { companyId } : {});
  }

  formatDuration(minutes: number): string {
    if (!minutes) return '0min';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }

  liveElapsed(startedAt: string): string {
    const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }
}
