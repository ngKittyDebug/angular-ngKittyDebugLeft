import { inject } from '@angular/core';
import type { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { AuthService } from '@core/services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authRefreshInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (request.url.includes('auth/refresh')) {
          return throwError(() => error);
        }

        return authService.getNewTokenOrWait().pipe(
          switchMap(() => {
            const retryRequest = request.clone();

            return next(retryRequest);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
