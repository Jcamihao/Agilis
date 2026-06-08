import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { HealthScoreOverview } from '../models';

@Injectable({ providedIn: 'root' })
export class HealthScoreService {
  private readonly api = inject(ApiService);

  overview(companyId: string) {
    return this.api.get<HealthScoreOverview>('/health-score/overview', { companyId });
  }

  recalculate(companyId: string) {
    return this.api.get<any>('/health-score/recalculate', { companyId });
  }
}
