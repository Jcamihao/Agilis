import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../models/user.model';
import { AuthService } from '../services/auth.service';

function getRoles(route: ActivatedRouteSnapshot): UserRole[] {
  return (route.data['roles'] as UserRole[] | undefined) ?? [];
}

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const currentUser = authService.currentUser();
  const roles = getRoles(route);

  if (roles.length === 0) {
    return true;
  }

  if (currentUser && roles.includes(currentUser.role)) {
    return true;
  }

  return router.createUrlTree(['/app/tasks']);
};
