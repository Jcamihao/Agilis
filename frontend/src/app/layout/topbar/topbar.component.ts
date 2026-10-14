import {
  Component, Output, EventEmitter, inject, ChangeDetectionStrategy, OnInit, signal, ChangeDetectorRef, HostListener, ElementRef, ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsService } from '../../core/services/notifications.service';
import { Notification, NOTIFICATION_CONFIG } from '../../core/models';
import { GlobalSearchComponent } from '../../shared/components/global-search/global-search.component';
import { timeAgo } from '../../core/utils/format';

@Component({
  selector: 'ag-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, GlobalSearchComponent],
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

  showSearch        = signal(false);
  showNotifications = signal(false);
  showUserMenu      = signal(false);
  @ViewChild('userMenuWrap') userMenuWrap?: ElementRef<HTMLElement>;
  notifications     = signal<Notification[]>([]);
  notifLoading      = signal(false);

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      this.showSearch.update((v) => !v);
    }
    if (e.key === 'Escape') this.showUserMenu.set(false);
  }

  // The header's backdrop-filter traps `position: fixed` children inside the
  // bar, so a full-screen click-catcher can't work — check clicks manually.
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (this.showUserMenu() && !this.userMenuWrap?.nativeElement.contains(e.target as Node)) {
      this.showUserMenu.set(false);
    }
  }

  ngOnInit() {
    this.notifService.loadUnreadCount();
    this.notifService.connect().subscribe({
      next: (n) => {
        if (this.notifications().length > 0) {
          this.notifications.update(list => [n, ...list]);
        }
        this.cdr.markForCheck();
      },
    });
  }

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
  readonly timeAgo = timeAgo;
  logout() { this.auth.logout(); }
}
