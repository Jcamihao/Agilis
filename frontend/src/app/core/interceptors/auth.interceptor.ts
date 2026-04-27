import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const notificationService = inject(NotificationService);
  const accessToken = authService.accessToken();
  const isRefreshRequest = request.url.includes('/auth/refresh');
  const isLogoutRequest = request.url.includes('/auth/logout');
  const isLoginRequest = request.url.includes('/auth/login');
  const isRegisterRequest = request.url.includes('/auth/register');
  const isAuthLifecycleRequest =
    isRefreshRequest || isLogoutRequest || isLoginRequest || isRegisterRequest;
  const isApiRequest =
    request.url.startsWith(environment.apiUrl) || request.url.startsWith('/api');

  const buildRequest = (token: string | null) =>
    request.clone({
      withCredentials: isApiRequest ? true : request.withCredentials,
      setHeaders: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });

  const requestWithAuth = buildRequest(accessToken);

  return next(requestWithAuth).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401 && !isAuthLifecycleRequest) {
          return authService.refreshSession().pipe(
            switchMap((response) => next(buildRequest(response.accessToken))),
            catchError((refreshError: unknown) => {
              authService.logout();
              return throwError(() => refreshError);
            }),
          );
        }

        if (!isRefreshRequest && !isLogoutRequest && error.status >= 400 && error.status < 500) {
          notificationService.error(error.error?.message ?? 'Nao foi possivel concluir a operacao.');
        } else if (!isRefreshRequest && !isLogoutRequest) {
          notificationService.error('Ocorreu um erro inesperado. Tente novamente.');
        }
      }

      return throwError(() => error);
    }),
  );
};
