import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./auth-layout/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
        title: 'Entrar — Agilis',
      },
      {
        path: 'register',
        loadComponent: () => import('./register/register.component').then((m) => m.RegisterComponent),
        title: 'Criar Conta — Agilis',
      },
    ],
  },
];
