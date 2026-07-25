import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';
import { AUTH_SERVER_URL } from '@core/constants/auth-constants';
import { AuthService } from '@core/services/auth.service';

const AUTH_SERVER_ORIGIN = new URL(AUTH_SERVER_URL).origin;

const isAuthServerRequest = (url: string): boolean => {
  try {
    // Compare full origins, not a substring: a crafted path segment can embed the auth
    // host on another origin and must not receive the token.
    return new URL(url).origin === AUTH_SERVER_ORIGIN;
  } catch {
    // Non-absolute or unparseable URL: never an auth-server request.
    return false;
  }
};

export const authBearerInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);

  if (isAuthServerRequest(request.url)) {
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
