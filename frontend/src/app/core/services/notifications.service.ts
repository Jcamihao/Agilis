import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { Notification, NotificationsPage } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  unreadCount = signal(0);
  private eventSource: EventSource | null = null;

  getAll(page = 1, limit = 20) {
    return this.api.get<NotificationsPage>('/notifications', {
      page: String(page),
      limit: String(limit),
    });
  }

  getUnreadCount() {
    return this.api.get<{ count: number }>('/notifications/unread-count');
  }

  markAsRead(id: string) {
    return this.api.patch<void>(`/notifications/${id}/read`, {});
  }

  markAllAsRead() {
    return this.api.patch<void>('/notifications/read-all', {});
  }

  deleteOld() {
    return this.api.delete<{ deleted: number }>('/notifications/old');
  }

  // ── SSE ──────────────────────────────────────────────────────────────────

  /** Conecta ao stream SSE de notificações em tempo real */
  connect(): Observable<Notification> {
    return new Observable<Notification>((observer) => {
      const token = this.auth.token();
      if (!token) { observer.complete(); return; }

      // EventSource não suporta Authorization header — token via query param
      const url = `${environment.apiUrl}/notifications/stream?token=${encodeURIComponent(token)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onmessage = (event) => {
        try {
          const notification: Notification = JSON.parse(event.data);
          this.unreadCount.update((n) => n + 1);
          observer.next(notification);
        } catch { /* ignore parse errors */ }
      };

      this.eventSource.onerror = () => {
        // Reconnect automático é feito pelo browser; erros são esperados ao fechar
      };

      return () => this.disconnect();
    });
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
  }

  loadUnreadCount() {
    this.getUnreadCount().subscribe((r) => this.unreadCount.set(r.count));
  }
}
