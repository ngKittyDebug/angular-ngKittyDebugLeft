import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { AUTH_SERVER_URL } from '@core/constants/auth-constants';
import type { AuthApiResponse } from '@shared/models/auth-api-response.model';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly _token = signal<string | null>(null);

  public readonly token = this._token.asReadonly();

  public saveToken(token: string): void {
    this._token.set(token);
  }

  public clearToken(): void {
    this._token.set(null);
  }

  public refresh() {
    if (!this._token()) {
      return;
    }

    return this.http.post<AuthApiResponse>(`${AUTH_SERVER_URL}auth/refresh`, null, {
      withCredentials: true,
    });
  }

  public logout() {
    if (!this._token()) {
      return;
    }

    return this.http.post(`${AUTH_SERVER_URL}auth/logout`, null, {
      withCredentials: true,
    });
  }
}
