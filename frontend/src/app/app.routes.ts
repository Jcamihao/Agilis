import { Routes } from '@angular/router';
import { authGuard, publicGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [publicGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        title: 'Dashboard — Agilis',
      },
      {
        path: 'companies',
        loadComponent: () => import('./features/companies/companies.component').then((m) => m.CompaniesComponent),
        title: 'Empresas — Agilis',
      },
      {
        path: 'teams',
        loadComponent: () => import('./features/teams/teams.component').then((m) => m.TeamsComponent),
        title: 'Equipes — Agilis',
      },
      {
        path: 'members',
        loadComponent: () => import('./features/members/members.component').then((m) => m.MembersComponent),
        title: 'Membros — Agilis',
      },
      {
        path: 'projects',
        loadComponent: () => import('./features/projects/projects.component').then((m) => m.ProjectsComponent),
        title: 'Projetos — Agilis',
      },
      {
        path: 'projects/:id/kanban',
        loadComponent: () => import('./features/kanban/kanban.component').then((m) => m.KanbanComponent),
        title: 'Kanban — Agilis',
      },
      {
        path: 'projects/:id/list',
        loadComponent: () => import('./features/list-view/list-view.component').then((m) => m.ListViewComponent),
        title: 'Lista — Agilis',
      },
      {
        path: 'projects/:id/time-report',
        loadComponent: () => import('./features/time-report/time-report.component').then((m) => m.TimeReportComponent),
        title: 'Tempo — Agilis',
      },
      {
        path: 'projects/:id/gantt',
        loadComponent: () => import('./features/gantt/gantt.component').then((m) => m.GanttComponent),
        title: 'Gantt — Agilis',
      },
      {
        path: 'my-tasks',
        loadComponent: () => import('./features/my-tasks/my-tasks.component').then((m) => m.MyTasksComponent),
        title: 'Minhas Tarefas — Agilis',
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
        title: 'Perfil — Agilis',
      },
      {
        path: 'calendar',
        loadComponent: () => import('./features/calendar/calendar.component').then((m) => m.CalendarComponent),
        title: 'Calendário — Agilis',
      },
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications.component').then((m) => m.NotificationsComponent),
        title: 'Notificações — Agilis',
      },
      {
        path: 'automations',
        loadComponent: () => import('./features/automations/automations.component').then((m) => m.AutomationsComponent),
        title: 'Automações — Agilis',
      },
      {
        path: 'metrics',
        loadComponent: () => import('./features/metrics/metrics.component').then((m) => m.MetricsComponent),
        title: 'Métricas — Agilis',
      },
      {
        path: 'ia',
        loadComponent: () => import('./features/ia/ia.component').then((m) => m.IaComponent),
        title: 'Assistente IA — Agilis',
      },
      {
        path: 'competitive',
        loadComponent: () => import('./features/competitive/competitive.component').then((m) => m.CompetitiveComponent),
        title: 'Centro de Operações — Agilis',
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/metrics/metrics.component').then((m) => m.MetricsComponent),
        title: 'Relatórios — Agilis',
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/metrics/metrics.component').then((m) => m.MetricsComponent),
        title: 'Auditoria — Agilis',
      },
      {
        path: 'webhooks',
        loadComponent: () => import('./features/webhooks/webhooks.component').then((m) => m.WebhooksComponent),
        title: 'Webhooks — Agilis',
      },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
