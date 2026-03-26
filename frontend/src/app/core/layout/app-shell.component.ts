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
import { materialImports } from '../../shared/material/material.imports';

type NavigationCategory = 'delivery' | 'visibility' | 'administration';

interface NavigationItem {
  label: string;
  icon: string;
  link: string;
  description: string;
  category: NavigationCategory;
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
  protected readonly deliveryNavigation = computed(() =>
    this.availableNavigation().filter((item) => item.category === 'delivery'),
  );
  protected readonly visibilityNavigation = computed(() =>
    this.availableNavigation().filter((item) => item.category === 'visibility'),
  );
  protected readonly administrationNavigation = computed(() =>
    this.availableNavigation().filter((item) => item.category === 'administration'),
  );
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
      label: 'Meu foco',
      icon: 'target',
      link: '/app/focus',
      description: 'Fila pessoal do dia, prioridades calculadas e cobrancas automaticas em curso.',
      category: 'delivery',
    },
    {
      label: 'Kanban',
      icon: 'view_kanban',
      link: '/app/tasks',
      description: 'Board principal da operação, com cards, responsáveis e status do fluxo.',
      category: 'delivery',
    },
    {
      label: 'Planner',
      icon: 'calendar_month',
      link: '/app/planner',
      description: 'Fila temporal para priorização, vencimentos e ritmo semanal.',
      category: 'delivery',
    },
    {
      label: 'Dashboard',
      icon: 'space_dashboard',
      link: '/app/dashboard',
      description: 'Visão executiva com throughput, atrasos e saúde geral da operação.',
      category: 'visibility',
    },
    {
      label: 'Users',
      icon: 'groups',
      link: '/app/users',
      description: 'Gestão de membros, papéis e capacidade do time.',
      category: 'administration',
      roles: ['ADMIN', 'MANAGER'],
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

  protected categoryLabel(category: NavigationCategory | undefined): string {
    switch (category) {
      case 'delivery':
        return 'Entrega';
      case 'visibility':
        return 'Visibilidade';
      case 'administration':
        return 'Administração';
      default:
        return 'Operação';
    }
  }

  protected logout(): void {
    this.authService.logout();
  }
}
