import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface TaskTemplate {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  priority: string;
  checklist: { label: string; order: number }[];
  estimatedHours?: number;
  createdBy: { id: string; name: string; avatarUrl?: string };
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class TaskTemplatesService {
  private readonly api = inject(ApiService);

  list(companyId: string) {
    return this.api.get<TaskTemplate[]>('/task-templates', { companyId });
  }

  create(data: Partial<TaskTemplate> & { companyId: string }) {
    return this.api.post<TaskTemplate>('/task-templates', data);
  }

  update(id: string, data: Partial<TaskTemplate>) {
    return this.api.put<TaskTemplate>(`/task-templates/${id}`, data);
  }

  delete(id: string) {
    return this.api.delete<void>(`/task-templates/${id}`);
  }

  use(id: string, projectId: string, assigneeId?: string, sprintId?: string) {
    return this.api.post<any>(`/task-templates/${id}/use`, { projectId, assigneeId, sprintId });
  }
}
