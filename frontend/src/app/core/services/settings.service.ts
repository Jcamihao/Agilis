import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  MySettingsResponse,
  UpdateMySettingsPayload,
} from '../models/settings.model';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly http = inject(HttpClient);

  getMine(): Observable<MySettingsResponse> {
    return this.http.get<MySettingsResponse>(`${environment.apiUrl}/settings/me`);
  }

  updateMine(payload: UpdateMySettingsPayload): Observable<MySettingsResponse> {
    return this.http.patch<MySettingsResponse>(`${environment.apiUrl}/settings/me`, payload);
  }
}
