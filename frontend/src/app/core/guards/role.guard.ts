import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { UserRole } from '../models/user.model';
import { AuthService } from '../services/auth.service';

function getRoles(route: ActivatedRouteSnapshot): UserRole[] {
  return (route.data['roles'] as UserRole[] | undefined) ?? [];
}

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const roles = getRoles(route);

  if (roles.length === 0) {
    return true;
  }

  const canAccess = (): boolean => {
    const currentUser = authService.currentUser();
    return Boolean(currentUser && roles.includes(currentUser.role));
  };

  if (canAccess()) {
    return true;
  }

  return authService.restoreSession().pipe(
    map((isAuthenticated) =>
      isAuthenticated && canAccess() ? true : router.createUrlTree(['/app/tasks']),
    ),
  );
};
