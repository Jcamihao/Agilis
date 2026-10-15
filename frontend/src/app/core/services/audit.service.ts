import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly api = inject(ApiService);

  getAll(companyId: string, filters: Record<string, string> = {}) {
    return this.api.get<any>('/audit', { companyId, ...filters });
  }
  getStats(companyId: string) {
    return this.api.get<any>('/audit/stats', { companyId });
  }
}
