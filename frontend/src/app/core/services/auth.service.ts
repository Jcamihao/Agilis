import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { User, AuthResponse, ApiResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = environment.apiUrl;

  private _user = signal<User | null>(null);
  private _token = signal<string | null>(null);

  readonly user = this._user.asReadonly();
  readonly token = this._token.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());
  readonly currentCompanyId = computed(() => this._user()?.companies?.[0]?.companyId);

  constructor() {
    this.restoreSession();
  }

  login(email: string, password: string) {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap((res) => {
        if (res.success) this.setSession(res.data);
      }),
    );
  }

  register(data: {
    name: string; email: string; password: string; companyName?: string;
    phone?: string; cpfCnpj?: string; cep?: string; uf?: string;
    address?: string; addressNumber?: string; addressComplement?: string;
    inviteToken?: string;
  }) {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.apiUrl}/auth/register`, data).pipe(
      tap((res) => {
        if (res.success) this.setSession(res.data);
      }),
    );
  }

  /**
   * Após aceitar um convite, recarrega o perfil e põe a empresa aceita como
   * PRIMEIRA de `user.companies` (o app usa `companies[0]` como empresa ativa).
   */
  refreshCompanies(firstCompanyId: string) {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/auth/me`).pipe(
      tap((res) => {
        if (!res.success) return;
        const companies = [...(res.data.companies ?? [])];
        const idx = companies.findIndex((c) => c.companyId === firstCompanyId);
        if (idx > 0) companies.unshift(...companies.splice(idx, 1));
        this.updateUser({ companies });
      }),
    );
  }

  logout() {
    localStorage.removeItem('agilis_token');
    localStorage.removeItem('agilis_user');
    this._token.set(null);
    this._user.set(null);
    this.router.navigate(['/auth/login']);
  }

  updateUser(user: Partial<User>) {
    const current = this._user();
    if (current) {
      const updated = { ...current, ...user };
      this._user.set(updated);
      localStorage.setItem('agilis_user', JSON.stringify(updated));
    }
  }

  private setSession(data: AuthResponse) {
    this._token.set(data.accessToken);
    this._user.set(data.user);
    localStorage.setItem('agilis_token', data.accessToken);
    localStorage.setItem('agilis_user', JSON.stringify(data.user));
  }

  private restoreSession() {
    const token = localStorage.getItem('agilis_token');
    const user = localStorage.getItem('agilis_user');
    if (token && user) {
      this._token.set(token);
      try { this._user.set(JSON.parse(user)); } catch {}
    }
  }
}
