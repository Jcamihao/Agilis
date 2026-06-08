import {
  Component, Output, EventEmitter, inject, ChangeDetectionStrategy, OnInit, signal, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { Notification, NOTIFICATION_CONFIG } from '../../core/models';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Component({
  selector: 'ag-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, MatMenuModule],
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss']
})
export class TopbarComponent implements OnInit {
  @Output() menuToggle = new EventEmitter<void>();

  private readonly auth    = inject(AuthService);
  private readonly router  = inject(Router);
  private readonly cdr     = inject(ChangeDetectorRef);
  readonly notifService    = inject(NotificationsService);
  readonly user            = this.auth.user;

  showNotifications = signal(false);
  notifications     = signal<Notification[]>([]);
  notifLoading      = signal(false);

  ngOnInit() { this.notifService.loadUnreadCount(); }

  onSearchFocus(event: FocusEvent) {
    const el = event.target as HTMLInputElement;
    el.style.background      = '#fff';
    el.style.border          = '1px solid #a5b4fc';
    el.style.boxShadow       = '0 0 0 3px rgba(99,102,241,0.1)';
  }
  onSearchBlur(event: FocusEvent) {
    const el = event.target as HTMLInputElement;
    el.style.background      = '#f3f4f6';
    el.style.border          = '1px solid transparent';
    el.style.boxShadow       = 'none';
  }

  toggleNotifications() {
    this.showNotifications.update((v) => !v);
    if (this.showNotifications() && this.notifications().length === 0) {
      this.loadNotifications();
    }
  }

  loadNotifications() {
    this.notifLoading.set(true);
    this.notifService.getAll(1, 15).subscribe({
      next: (page) => {
        this.notifications.set(page.items);
        this.notifService.unreadCount.set(page.unread);
        this.notifLoading.set(false);
      },
      error: () => this.notifLoading.set(false),
    });
  }

  handleNotifClick(notif: Notification) {
    if (!notif.isRead) {
      this.notifService.markAsRead(notif.id).subscribe(() => {
        this.notifications.update((list) =>
          list.map((n) => n.id === notif.id ? { ...n, isRead: true } : n)
        );
        this.notifService.unreadCount.update((c) => Math.max(0, c - 1));
      });
    }
    if (notif.entityType === 'task') this.showNotifications.set(false);
  }

  markAllRead() {
    this.notifService.markAllAsRead().subscribe(() => {
      this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
      this.notifService.unreadCount.set(0);
    });
  }

  getNotifIcon(type: string): string {
    return NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG]?.icon ?? 'notifications';
  }
  getNotifColor(type: string): string {
    return NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG]?.color ?? '#6366f1';
  }
  timeAgo(date: string): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  }
  logout() { this.auth.logout(); }
}
