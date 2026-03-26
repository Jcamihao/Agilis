import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);
  const accessToken = authService.accessToken();

  const requestWithAuth = accessToken
    ? request.clone({
        setHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
    : request;

  return next(requestWithAuth).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401) {
          authService.logout();
        } else if (error.status >= 400 && error.status < 500) {
          notificationService.error(error.error?.message ?? 'Nao foi possivel concluir a operacao.');
        } else {
          notificationService.error('Ocorreu um erro inesperado. Tente novamente.');
        }
      }

      return throwError(() => error);
    }),
  );
};
