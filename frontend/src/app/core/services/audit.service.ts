import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from './api.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  getAll(companyId: string, filters: Record<string, string> = {}) {
    return this.api.get<any>('/audit', { companyId, ...filters });
  }
  getStats(companyId: string) {
    return this.api.get<any>('/audit/stats', { companyId });
  }
  getByEntity(entityType: string, entityId: string) {
    return this.api.get<any[]>(`/audit/${entityType}/${entityId}`);
  }
}
