import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map } from 'rxjs';
import { ApiResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  protected readonly apiUrl = environment.apiUrl;

  get<T>(path: string, params?: Record<string, string>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => v && (httpParams = httpParams.set(k, v)));
    return this.http.get<ApiResponse<T>>(`${this.apiUrl}${path}`, { params: httpParams }).pipe(
      map((res) => res.data),
    );
  }

  post<T>(path: string, body: any, params?: Record<string, string>): Observable<T> {
    let httpParams = new HttpParams();
    if (params) Object.entries(params).forEach(([k, v]) => v && (httpParams = httpParams.set(k, v)));
    return this.http.post<ApiResponse<T>>(`${this.apiUrl}${path}`, body, { params: httpParams }).pipe(map((res) => res.data));
  }

  put<T>(path: string, body: any): Observable<T> {
    return this.http.put<ApiResponse<T>>(`${this.apiUrl}${path}`, body).pipe(map((res) => res.data));
  }

  patch<T>(path: string, body: any): Observable<T> {
    return this.http.patch<ApiResponse<T>>(`${this.apiUrl}${path}`, body).pipe(map((res) => res.data));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<ApiResponse<T>>(`${this.apiUrl}${path}`).pipe(map((res) => res.data));
  }
}
