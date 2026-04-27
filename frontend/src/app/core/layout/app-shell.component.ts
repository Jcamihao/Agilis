import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';
import { materialImports } from '../../shared/material/material.imports';

interface NavigationItem {
  label: string;
  icon: string;
  link: string;
  roles?: Array<'ADMIN' | 'MANAGER' | 'USER'>;
}

@Component({
  selector: 'agilis-app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ...materialImports],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly currentUrl = signal(this.router.url);

  protected readonly brand = environment.brand;
  protected readonly currentUser = this.authService.currentUser;
  protected readonly availableNavigation = computed(() =>
    this.navigationItems.filter((item) => {
      const currentUser = this.currentUser();
      return !item.roles || (currentUser ? item.roles.includes(currentUser.role) : false);
    }),
  );
  protected readonly railNavigation = computed(() => this.availableNavigation());
  protected readonly currentSection = computed((): NavigationItem => {
    const currentUrl = this.currentUrl();
    return (
      this.availableNavigation().find((item) => currentUrl.startsWith(item.link)) ??
      this.availableNavigation()[0] ??
      this.navigationItems[0]
    );
  });

  private readonly navigationItems: NavigationItem[] = [
    {
      label: 'Dashboard',
      icon: 'grid_view',
      link: '/app/dashboard',
    },
    {
      label: 'Tasks',
      icon: 'assignment',
      link: '/app/tasks',
    },
    {
      label: 'Team',
      icon: 'group',
      link: '/app/users',
      roles: ['ADMIN', 'MANAGER'],
    },
    {
      label: 'Focus',
      icon: 'track_changes',
      link: '/app/focus',
    },
    {
      label: 'Planner',
      icon: 'account_tree',
      link: '/app/planner',
    },
    {
      label: 'Settings',
      icon: 'settings',
      link: '/app/settings',
    },
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
      });

    this.authService
      .me()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          return;
        },
      });
  }

  protected trackNavigation(_: number, item: NavigationItem): string {
    return item.link;
  }

  protected logout(): void {
    this.authService.logout();
  }

  protected showNotifications(): void {
    this.notificationService.success('Nenhuma notificação nova no momento.');
  }
}
