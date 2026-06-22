import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { ACCESS_TOKEN_KEY } from '@core/constants/auth-constants';

export const guestGuard: CanActivateFn = () => {
  //TODO локалка замениться на сервис авторизации, для проверки пока так
  const isUserInLocalStorage = localStorage.getItem(ACCESS_TOKEN_KEY);
  const router = inject(Router);

  return !isUserInLocalStorage ? true : router.createUrlTree(['/']);
};
