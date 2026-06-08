import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Insight } from '../models';

@Injectable({ providedIn: 'root' })
export class InsightsService {
  private readonly api = inject(ApiService);

  list(companyId: string) {
    return this.api.get<Insight[]>('/insights', { companyId });
  }

  generate(companyId: string) {
    return this.api.post<Insight[]>('/insights/generate', null as any, { companyId });
  }

  markRead(id: string) {
    return this.api.patch<Insight>(`/insights/${id}/read`, {});
  }

  dismiss(id: string) {
    return this.api.patch<Insight>(`/insights/${id}/dismiss`, {});
  }
}
