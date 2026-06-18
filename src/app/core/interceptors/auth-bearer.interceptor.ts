import type { HttpInterceptorFn } from '@angular/common/http';
import { AUTH_SERVER_URL } from '@core/constants/auth-constants';

export const authBearerInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.url.includes(AUTH_SERVER_URL)) {
    const token = localStorage.getItem('accessToken');

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
