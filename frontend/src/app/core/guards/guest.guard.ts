import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return authService
      .restoreSession()
      .pipe(map((isAuthenticated) => (isAuthenticated ? router.createUrlTree(['/app/tasks']) : true)));
  }

  return router.createUrlTree(['/app/tasks']);
};
