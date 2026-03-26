import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginPayload, RegisterPayload } from '../models/auth.model';
import { User } from '../models/user.model';

const ACCESS_TOKEN_KEY = 'agilis.access-token';
const CURRENT_USER_KEY = 'agilis.current-user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly currentUserSignal = signal<User | null>(null);

  readonly accessToken = computed(() => this.accessTokenSignal());
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => Boolean(this.accessTokenSignal()));

  constructor() {
    this.hydrateFromStorage();
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload)
      .pipe(tap((response) => this.persistSession(response)));
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload)
      .pipe(tap((response) => this.persistSession(response)));
  }

  me(): Observable<User> {
    return this.http
      .get<User>(`${environment.apiUrl}/auth/me`)
      .pipe(tap((user) => this.setCurrentUser(user)));
  }

  logout(): void {
    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    void this.router.navigate(['/login']);
  }

  private hydrateFromStorage(): void {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const currentUser = localStorage.getItem(CURRENT_USER_KEY);

    if (accessToken) {
      this.accessTokenSignal.set(accessToken);
    }

    if (currentUser) {
      this.currentUserSignal.set(JSON.parse(currentUser) as User);
    }
  }

  private persistSession(response: AuthResponse): void {
    this.accessTokenSignal.set(response.accessToken);
    this.currentUserSignal.set(response.user);
    localStorage.setItem(ACCESS_TOKEN_KEY, response.accessToken);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(response.user));
  }

  private setCurrentUser(user: User): void {
    this.currentUserSignal.set(user);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  }
}
