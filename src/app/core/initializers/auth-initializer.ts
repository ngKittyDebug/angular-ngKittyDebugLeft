import { inject } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import { catchError, map, of } from 'rxjs';

export function authInitializer() {
  const authService = inject(AuthService);

  return authService.refresh().pipe(
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
