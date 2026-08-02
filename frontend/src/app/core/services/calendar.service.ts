import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { CalendarRange, Task } from '../models';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = environment.apiUrl;

  getRange(companyId: string, start: string, end: string) {
    return this.api.get<CalendarRange>('/calendar', { companyId, start, end });
  }

  getUpcoming(companyId: string, days = 7) {
    return this.api.get<Task[]>('/calendar/upcoming', { companyId, days: String(days) });
  }

  downloadIcal(companyId: string) {
    const token = this.auth.token();
    const params = new HttpParams().set('companyId', companyId);
    this.http.get(`${this.base}/calendar/ical`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob',
    }).subscribe((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `agilis-calendar-${Date.now()}.ics`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
  }
}
