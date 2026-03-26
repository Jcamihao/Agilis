import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';
import { LoginPageComponent } from './features/auth/login-page.component';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { FocusPageComponent } from './features/focus/focus-page.component';
import { PlannerPageComponent } from './features/planner/planner-page.component';
import { TasksPageComponent } from './features/tasks/tasks-page.component';
import { UsersPageComponent } from './features/users/users-page.component';
import { AppShellComponent } from './core/layout/app-shell.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginPageComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'app',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'focus',
        component: FocusPageComponent,
      },
      {
        path: 'dashboard',
        component: DashboardPageComponent,
      },
      {
        path: 'planner',
        component: PlannerPageComponent,
      },
      {
        path: 'tasks',
        component: TasksPageComponent,
      },
      {
        path: 'users',
        component: UsersPageComponent,
        canActivate: [roleGuard],
        data: {
          roles: ['ADMIN', 'MANAGER'],
        },
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'tasks',
      },
    ],
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'app/tasks',
  },
  {
    path: '**',
    redirectTo: 'app/tasks',
  },
];
