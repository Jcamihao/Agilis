import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginPayload, RegisterPayload } from '../models/auth.model';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly currentUserSignal = signal<User | null>(null);
  private refreshSessionRequest: Observable<AuthResponse> | null = null;

  readonly accessToken = computed(() => this.accessTokenSignal());
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => Boolean(this.accessTokenSignal()));

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload, {
        withCredentials: true,
      })
      .pipe(tap((response) => this.persistSession(response)));
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload, {
        withCredentials: true,
      })
      .pipe(tap((response) => this.persistSession(response)));
  }

  refreshSession(): Observable<AuthResponse> {
    if (!this.refreshSessionRequest) {
      this.refreshSessionRequest = this.http
        .post<AuthResponse>(
          `${environment.apiUrl}/auth/refresh`,
          {},
          {
            withCredentials: true,
          },
        )
        .pipe(
          tap((response) => this.persistSession(response)),
          finalize(() => {
            this.refreshSessionRequest = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
    }

    return this.refreshSessionRequest;
  }

  restoreSession(): Observable<boolean> {
    if (this.isAuthenticated()) {
      return of(true);
    }

    return this.refreshSession().pipe(
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
    );
  }

  me(): Observable<User> {
    return this.http
      .get<User>(`${environment.apiUrl}/auth/me`, {
        withCredentials: true,
      })
      .pipe(tap((user) => this.setCurrentUser(user)));
  }

  applyCurrentUser(user: User): void {
    this.setCurrentUser(user);
  }

  logout(redirect = true): void {
    const hadSession = Boolean(this.accessTokenSignal() || this.currentUserSignal());
    this.clearSession();

    if (hadSession) {
      this.http
        .post<void>(
          `${environment.apiUrl}/auth/logout`,
          {},
          {
            withCredentials: true,
          },
        )
        .subscribe({
          error: () => {
            return;
          },
        });
    }

    if (redirect) {
      void this.router.navigate(['/login']);
    }
  }

  private clearSession(): void {
    this.accessTokenSignal.set(null);
    this.currentUserSignal.set(null);
  }

  private persistSession(response: AuthResponse): void {
    this.accessTokenSignal.set(response.accessToken);
    this.currentUserSignal.set(response.user);
  }

  private setCurrentUser(user: User): void {
    this.currentUserSignal.set(user);
  }
}
