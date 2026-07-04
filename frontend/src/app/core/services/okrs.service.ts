import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Objective, KeyResult, OkrSummary } from '../models';

@Injectable({ providedIn: 'root' })
export class OkrsService {
  private readonly api = inject(ApiService);

  summary()           { return this.api.get<OkrSummary>('/okrs/summary'); }
  list()              { return this.api.get<Objective[]>('/okrs'); }
  get(id: string)     { return this.api.get<Objective>(`/okrs/${id}`); }

  create(dto: { title: string; description?: string; startDate: string; endDate: string }) {
    return this.api.post<Objective>('/okrs', dto);
  }
  update(id: string, dto: Partial<{ title: string; description: string; status: string; startDate: string; endDate: string }>) {
    return this.api.patch<Objective>(`/okrs/${id}`, dto);
  }
  delete(id: string) { return this.api.delete<void>(`/okrs/${id}`); }

  // Key Results
  createKR(objectiveId: string, dto: { title: string; type?: string; targetValue: number; unit?: string }) {
    return this.api.post<KeyResult>(`/okrs/${objectiveId}/key-results`, dto);
  }
  updateKR(id: string, dto: Partial<{ title: string; currentValue: number; targetValue: number; unit: string }>) {
    return this.api.patch<KeyResult>(`/okrs/key-results/${id}`, dto);
  }
  deleteKR(id: string) { return this.api.delete<void>(`/okrs/key-results/${id}`); }

  // Tasks
  linkTasks(keyResultId: string, taskIds: string[]) {
    return this.api.post<KeyResult>(`/okrs/key-results/${keyResultId}/tasks`, { taskIds });
  }
  unlinkTask(keyResultId: string, taskId: string) {
    return this.api.delete<void>(`/okrs/key-results/${keyResultId}/tasks/${taskId}`);
  }
}
