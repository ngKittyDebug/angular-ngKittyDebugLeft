import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import { delay, of, throwError } from 'rxjs';
import type { LoginFormGroup } from '@features/auth/data/models/login-form.model';

// Объявляем строгие интерфейсы ответов сервера, которые ожидает ваше приложение
export interface AuthSuccessResponse {
  accessToken: string;
  user: {
    id: number;
    name: string;
  };
}

export interface RefreshSuccessResponse {
  accessToken: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  /**
   * Затычка для LOGIN (Вход)
   */
  public onAuthSubmit(loginFormGroup: LoginFormGroup): Observable<AuthSuccessResponse> {
    console.log('[Mock API] Метод onAuthSubmit вызван с данными:', loginFormGroup);

    const formValues = loginFormGroup as unknown as Record<string, string>;

    if (formValues && formValues['login'] === 'error') {
      return throwError(() => new Error('Unauthorized')).pipe(delay(1000));
    }

    const mockResponse: AuthSuccessResponse = {
      accessToken: 'fake-jwt-access-token-12345-success',
      user: { id: 1, name: 'Тестовый Пользователь' },
    };

    return of(mockResponse).pipe(delay(1000));
  }

  /**
   * Затычка для REGISTER (Регистрация)
   */
  public onRegisterSubmit(
    registerFormGroup: Record<string, unknown>,
  ): Observable<AuthSuccessResponse> {
    console.log('[Mock API] Метод onRegisterSubmit вызван с данными:', registerFormGroup);

    const mockResponse: AuthSuccessResponse = {
      accessToken: 'fake-jwt-access-token-after-registration',
      user: { id: 2, name: 'Новый Пользователь' },
    };

    return of(mockResponse).pipe(delay(1000));
  }

  /**
   * Затычка для REFRESH (Обновление токена)
   */
  public onRefresh(): Observable<RefreshSuccessResponse> {
    console.log('[Mock API] Сеть: запрос на обновление токена /auth/refresh');

    const mockResponse: RefreshSuccessResponse = {
      accessToken: 'updated-fake-jwt-access-token-67890',
    };

    return of(mockResponse).pipe(delay(800));
  }

  /**
   * Затычка для LOGOUT (Выход)
   */
  public onLogout(): Observable<void> {
    console.log('[Mock API] Сеть: запрос на инвалидацию сессии /auth/logout');

    return of(void 0).pipe(delay(500));
  }
}
