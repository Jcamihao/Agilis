import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardOverview } from '../models/dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly http = inject(HttpClient);

  getOverview(): Observable<DashboardOverview> {
    return this.http.get<DashboardOverview>(`${environment.apiUrl}/dashboard/overview`);
  }
}
