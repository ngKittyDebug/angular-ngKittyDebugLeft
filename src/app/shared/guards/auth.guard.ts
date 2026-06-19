import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = (_, state) => {
  //TODO локалка замениться на сервис авторизации, для проверки пока так
  const isUserInLocalStorage = localStorage.getItem('accessToken');
  const router = inject(Router);

  return isUserInLocalStorage
    ? true
    : router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
};
