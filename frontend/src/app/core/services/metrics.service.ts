import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly api = inject(ApiService);

  getCompany(companyId: string, days = 30) {
    return this.api.get<any>('/metrics/company', { companyId, days: String(days) });
  }
  getAllUsers(companyId: string, days = 30) {
    return this.api.get<any[]>('/metrics/company/users', { companyId, days: String(days) });
  }
  getMyMetrics(companyId: string, days = 30) {
    return this.api.get<any>('/metrics/user/me', { companyId, days: String(days) });
  }
  getTeam(teamId: string, days = 30) {
    return this.api.get<any>(`/metrics/team/${teamId}`, { days: String(days) });
  }
}
