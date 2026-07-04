import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { catchError, map, of, timeout } from 'rxjs';

export function authInitializer() {
  const authService = inject(AuthService);

  return authService.refresh().pipe(
    timeout(4000),
    map((response) => {
      authService.handleSuccessfulAuth(response.accessToken);

      return response;
    }),
    catchError(() => {
      authService.clearLocalState(false);

      return of(null);
    }),
  );
}
