import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';
import { AUTH_SERVER_URL } from '@core/constants/auth-constants';
import { AuthService } from '@core/services/auth.service';

export const authBearerInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);

  if (request.url.includes(AUTH_SERVER_URL)) {
    if (request.url.includes('auth/refresh')) {
      return next(request);
    }

    const token = authService.token();

    if (!token) {
      return next(request);
    }

    const authRequest = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    return next(authRequest);
  }

  return next(request);
};
