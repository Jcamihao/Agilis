import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkAssistantOverview } from '../models/work-assistant.model';

@Injectable({
  providedIn: 'root',
})
export class WorkAssistantService {
  private readonly http = inject(HttpClient);

  getOverview(): Observable<WorkAssistantOverview> {
    return this.http.get<WorkAssistantOverview>(
      `${environment.apiUrl}/work-assistant/overview`,
    );
  }
}
