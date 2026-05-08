import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard: CanMatchFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const roles: number[] = route.data?.['roles'] ?? [];

  if (roles.length === 0) return true;

  const user = auth.currentUser();
  if (!user) return router.createUrlTree(['/']);

  return roles.some(r => user.roles.includes(r)) || router.createUrlTree(['/']);
};
