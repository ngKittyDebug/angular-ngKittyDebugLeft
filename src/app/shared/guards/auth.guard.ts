import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';
import { environment } from '@environments/environment';

export const authGuard: CanActivateFn = (_, state) => {
  if (environment.disableAuthGuards) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.token() !== null
    ? true
    : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};
