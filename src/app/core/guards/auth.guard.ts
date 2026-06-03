import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

export const authGuardGuard: CanActivateFn = () => {
  //TODO локалка замениться на сервис авторизации, для проверки пока так
  const isUserInLocalStorage = localStorage.getItem('loginFormData');
  const router = inject(Router);

  return isUserInLocalStorage ? true : router.createUrlTree(['auth/login']);
};
