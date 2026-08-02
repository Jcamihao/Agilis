import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface TaskStatusConfig {
  id:        string;
  companyId: string;
  name:      string;
  color:     string;
  order:     number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class TaskStatusConfigService {
  private readonly api = inject(ApiService);

  list(companyId: string)                                                        { return this.api.get<TaskStatusConfig[]>(`/task-status-config?companyId=${companyId}`); }
  create(dto: { companyId: string; name: string; color?: string; order?: number }) { return this.api.post<TaskStatusConfig>('/task-status-config', dto); }
  update(id: string, dto: { name?: string; color?: string; order?: number })     { return this.api.patch<TaskStatusConfig>(`/task-status-config/${id}`, dto); }
  delete(id: string)                                                             { return this.api.delete<void>(`/task-status-config/${id}`); }
}
