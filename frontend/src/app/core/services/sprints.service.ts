import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Sprint } from '../models';

export interface CreateSprintPayload {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  projectId: string;
}

@Injectable({ providedIn: 'root' })
export class SprintsService {
  private readonly api = inject(ApiService);

  getByProject(projectId: string) {
    return this.api.get<Sprint[]>('/sprints', { projectId });
  }

  create(data: CreateSprintPayload) {
    return this.api.post<Sprint>('/sprints', data);
  }

  updateStatus(id: string, status: string) {
    return this.api.patch<Sprint>(`/sprints/${id}/status`, { status });
  }
}
