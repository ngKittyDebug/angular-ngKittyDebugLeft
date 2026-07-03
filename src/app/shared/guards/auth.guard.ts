import { inject, isDevMode } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

export const authGuard: CanActivateFn = (_, state) => {
  if (isDevMode()) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.token() !== null
    ? true
    : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};
