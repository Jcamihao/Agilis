import { Injectable, inject } from '@angular/core';
import { ApiService } from './api.service';
import { CalendarRange, Task } from '../models';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly api = inject(ApiService);

  getRange(companyId: string, start: string, end: string) {
    return this.api.get<CalendarRange>('/calendar', { companyId, start, end });
  }

  getUpcoming(companyId: string, days = 7) {
    return this.api.get<Task[]>('/calendar/upcoming', { companyId, days: String(days) });
  }
}
