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
        path: 'projects/:id/wiki',
        loadComponent: () => import('./features/wiki/wiki.component').then((m) => m.WikiComponent),
        title: 'Wiki — Agilis',
      },
      {
        path: 'approvals',
        loadComponent: () => import('./features/approvals/approvals.component').then((m) => m.ApprovalsComponent),
        title: 'Aprovações — Agilis',
      },
      {
        path: 'projects/:id/intake-forms',
        loadComponent: () => import('./features/intake-forms/intake-forms.component').then((m) => m.IntakeFormsComponent),
        title: 'Formulários de Entrada — Agilis',
      },
      {
        path: 'projects/:id/settings',
        loadComponent: () => import('./features/project-settings/project-settings.component').then((m) => m.ProjectSettingsComponent),
        title: 'Configurações do Projeto — Agilis',
      },
      {
        path: 'projects/:id/risks',
        loadComponent: () => import('./features/risks/risks.component').then((m) => m.RisksComponent),
        title: 'Riscos — Agilis',
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
        path: 'portfolio',
        loadComponent: () => import('./features/portfolio/portfolio.component').then((m) => m.PortfolioComponent),
        title: 'Portfolio Executivo — Agilis',
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
        path: 'workload',
        loadComponent: () => import('./features/workload/workload.component').then((m) => m.WorkloadComponent),
        title: 'Carga de Trabalho — Agilis',
      },
      {
        path: 'okrs',
        loadComponent: () => import('./features/okrs/okrs.component').then((m) => m.OkrsComponent),
        title: 'OKRs e Metas — Agilis',
      },
      {
        path: 'health-score',
        loadComponent: () => import('./features/health-score/health-score.component').then((m) => m.HealthScoreComponent),
        title: 'Health Score — Agilis',
      },
      {
        path: 'insights',
        loadComponent: () => import('./features/insights-page/insights-page.component').then((m) => m.InsightsPageComponent),
        title: 'Insights — Agilis',
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports.component').then((m) => m.ReportsComponent),
        title: 'Relatórios — Agilis',
      },
      {
        path: 'audit',
        loadComponent: () => import('./features/audit/audit.component').then((m) => m.AuditComponent),
        title: 'Auditoria — Agilis',
      },
      {
        path: 'sla',
        loadComponent: () => import('./features/sla/sla.component').then((m) => m.SlaComponent),
        title: 'SLA — Agilis',
      },
      {
        path: 'chat',
        loadComponent: () => import('./features/chat/chat-page.component').then((m) => m.ChatPageComponent),
        title: 'Comunicação — Agilis',
      },
      {
        path: 'webhooks',
        loadComponent: () => import('./features/webhooks/webhooks.component').then((m) => m.WebhooksComponent),
        title: 'Webhooks — Agilis',
      },
      {
        path: 'feed',
        loadComponent: () => import('./features/feed/feed.component').then((m) => m.FeedComponent),
        title: 'Mural — Agilis',
      },
      {
        path: 'corporate-wiki',
        loadComponent: () => import('./features/corporate-wiki/corporate-wiki.component').then((m) => m.CorporateWikiComponent),
        title: 'Wiki Corporativa — Agilis',
      },
      {
        path: 'hr',
        loadComponent: () => import('./features/hr/hr.component').then((m) => m.HrComponent),
        title: 'RH — Agilis',
      },
      {
        path: 'process-center',
        loadComponent: () => import('./features/process-center/process-center.component').then((m) => m.ProcessCenterComponent),
        title: 'Centro de Processos — Agilis',
      },
      {
        path: 'projects/:id/sprint-planning',
        loadComponent: () => import('./features/sprint-planning/sprint-planning.component').then((m) => m.SprintPlanningComponent),
        title: 'Sprint Planning — Agilis',
      },
    ],
  },
  // Public client portal — no auth required
  {
    path: 'portal/:token',
    loadComponent: () => import('./features/client-portal/client-portal.component').then((m) => m.ClientPortalComponent),
    title: 'Portal do Projeto — Agilis',
  },
  // Public intake form — no auth required
  {
    path: 'intake/:slug',
    loadComponent: () => import('./features/intake-public/intake-public.component').then((m) => m.IntakePublicComponent),
    title: 'Solicitação — Agilis',
  },
  { path: '**', redirectTo: '/dashboard' },
];
