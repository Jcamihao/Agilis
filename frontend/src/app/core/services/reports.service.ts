import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl;

  private buildParams(obj: Record<string, string | undefined>): HttpParams {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined && v !== '') p = p.set(k, v);
    }
    return p;
  }

  private download(url: string, params: HttpParams, filename: string) {
    const token = this.auth.token();
    return this.http.get(`${this.base}${url}`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    }).subscribe((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }

  downloadTasks(companyId: string, format: 'csv' | 'excel', filters: Record<string, string> = {}) {
    const ext = format === 'excel' ? 'xlsx' : 'csv';
    const params = this.buildParams({ companyId, format, ...filters });
    this.download('/reports/tasks', params, `tarefas-${Date.now()}.${ext}`);
  }

  downloadProductivity(companyId: string, format: 'csv' | 'excel', days = 30) {
    const ext = format === 'excel' ? 'xlsx' : 'csv';
    const params = this.buildParams({ companyId, format, days: String(days) });
    this.download('/reports/productivity', params, `produtividade-${Date.now()}.${ext}`);
  }

  downloadAudit(companyId: string, format: 'csv' | 'excel', from?: string, to?: string) {
    const ext = format === 'excel' ? 'xlsx' : 'csv';
    const params = this.buildParams({ companyId, format, from, to });
    this.download('/reports/audit', params, `auditoria-${Date.now()}.${ext}`);
  }

  downloadTimeTracking(companyId: string, format: 'csv' | 'excel', from?: string, to?: string) {
    const ext = format === 'excel' ? 'xlsx' : 'csv';
    const params = this.buildParams({ companyId, format, from, to });
    this.download('/reports/time-tracking', params, `time-tracking-${Date.now()}.${ext}`);
  }

  downloadOkrs(companyId: string, format: 'csv' | 'excel') {
    const ext = format === 'excel' ? 'xlsx' : 'csv';
    const params = this.buildParams({ companyId, format });
    this.download('/reports/okrs', params, `okrs-${Date.now()}.${ext}`);
  }
}
