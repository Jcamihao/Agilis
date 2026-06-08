import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsService } from '../../core/services/notifications.service';
import { Notification, NOTIFICATION_CONFIG } from '../../core/models';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

@Component({
  selector: 'ag-notifications',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit {
  private readonly service = inject(NotificationsService);

  loading = signal(true);
  notifications = signal<Notification[]>([]);
  page = signal<{ total: number; unread: number } | null>(null);
  activeFilter = signal<'all' | 'unread'>('all');
  currentPage = signal(1);

  filters = [
    { key: 'all' as const,    label: 'Todas' },
    { key: 'unread' as const, label: 'Não lidas' },
  ];

  filteredNotifs = () =>
    this.activeFilter() === 'unread'
      ? this.notifications().filter((n) => !n.isRead)
      : this.notifications();

  hasMore = () => {
    const p = this.page();
    return p ? this.notifications().length < p.total : false;
  };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.service.getAll(this.currentPage(), 20).subscribe({
      next: (data) => {
        this.notifications.update((list) => [...list, ...data.items]);
        this.page.set({ total: data.total, unread: data.unread });
        this.service.unreadCount.set(data.unread);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadMore() {
    this.currentPage.update((p) => p + 1);
    this.load();
  }

  markRead(notif: Notification) {
    if (notif.isRead) return;
    this.service.markAsRead(notif.id).subscribe(() => {
      this.notifications.update((list) =>
        list.map((n) => n.id === notif.id ? { ...n, isRead: true } : n)
      );
      this.page.update((p) => p ? { ...p, unread: Math.max(0, p.unread - 1) } : p);
      this.service.unreadCount.update((c) => Math.max(0, c - 1));
    });
  }

  markAllRead() {
    this.service.markAllAsRead().subscribe(() => {
      this.notifications.update((list) => list.map((n) => ({ ...n, isRead: true })));
      this.page.update((p) => p ? { ...p, unread: 0 } : p);
      this.service.unreadCount.set(0);
    });
  }

  deleteOld() {
    this.loading.set(true);
    this.service.deleteOld().subscribe({
      next: () => {
        this.notifications.set([]);
        this.currentPage.set(1);
        this.load();
      },
      error: () => this.loading.set(false),
    });
  }

  getIcon(type: string): string {
    return NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG]?.icon ?? 'notifications';
  }
  getColor(type: string): string {
    return NOTIFICATION_CONFIG[type as keyof typeof NOTIFICATION_CONFIG]?.color ?? '#6366f1';
  }
  timeAgo(date: string): string {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  }
}
