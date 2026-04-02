import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateTaskPayload,
  Task,
  TaskStatus,
  UpdateTaskPayload,
  UpdateTaskStatusPayload,
} from '../models/task.model';

@Injectable({
  providedIn: 'root',
})
export class TasksService {
  private readonly http = inject(HttpClient);

  list(filters?: { status?: TaskStatus; assignedToId?: string; search?: string }): Observable<Task[]> {
    let params = new HttpParams();

    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    if (filters?.assignedToId) {
      params = params.set('assignedToId', filters.assignedToId);
    }

    if (filters?.search) {
      params = params.set('search', filters.search);
    }

    return this.http.get<Task[]>(`${environment.apiUrl}/tasks`, {
      params,
    });
  }

  create(payload: CreateTaskPayload): Observable<Task> {
    return this.http.post<Task>(`${environment.apiUrl}/tasks`, payload);
  }

  update(taskId: string, payload: UpdateTaskPayload): Observable<Task> {
    return this.http.patch<Task>(`${environment.apiUrl}/tasks/${taskId}`, payload);
  }

  updateStatus(taskId: string, payload: UpdateTaskStatusPayload): Observable<Task> {
    return this.http.patch<Task>(`${environment.apiUrl}/tasks/${taskId}/status`, payload);
  }
}
