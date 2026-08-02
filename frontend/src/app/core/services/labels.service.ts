import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface Label {
  id:        string;
  companyId: string;
  name:      string;
  color:     string;
  createdAt: string;
}

export interface TaskLabel {
  taskId:  string;
  labelId: string;
  label:   Label;
}

@Injectable({ providedIn: 'root' })
export class LabelsService {
  private readonly api = inject(ApiService);

  list(companyId: string)                          { return this.api.get<Label[]>(`/labels?companyId=${companyId}`); }
  create(dto: { companyId: string; name: string; color?: string }) { return this.api.post<Label>('/labels', dto); }
  update(id: string, dto: { name?: string; color?: string })       { return this.api.patch<Label>(`/labels/${id}`, dto); }
  delete(id: string)                               { return this.api.delete<void>(`/labels/${id}`); }

  forTask(taskId: string)                          { return this.api.get<TaskLabel[]>(`/labels/task/${taskId}`); }
  addToTask(taskId: string, labelId: string)       { return this.api.post<void>(`/labels/task/${taskId}/${labelId}`, {}); }
  removeFromTask(taskId: string, labelId: string)  { return this.api.delete<void>(`/labels/task/${taskId}/${labelId}`); }
}
