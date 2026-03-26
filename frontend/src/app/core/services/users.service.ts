import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, UserRole } from '../models/user.model';

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  private readonly http = inject(HttpClient);

  list(): Observable<User[]> {
    return this.http.get<User[]>(`${environment.apiUrl}/users`);
  }

  create(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(`${environment.apiUrl}/users`, payload);
  }

  updateRole(userId: string, role: UserRole): Observable<User> {
    return this.http.patch<User>(`${environment.apiUrl}/users/${userId}/role`, { role });
  }
}
