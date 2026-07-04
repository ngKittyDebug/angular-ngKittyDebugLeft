import { HttpClient } from '@angular/common/http';
import { inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AUTH_SERVER_URL } from '@core/constants/auth-constants';
import type { AuthApiResponse } from '@shared/models/auth-api-response.model';
import { catchError, finalize, map, type Observable, shareReplay, throwError } from 'rxjs';

@Service()
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _token = signal<string | null>(null);
  private refreshChain$: Observable<string> | null = null;

  public readonly token = this._token.asReadonly();

  public saveToken(token: string): void {
    this._token.set(token);
  }

  public clearToken(): void {
    this._token.set(null);
  }

  public handleSuccessfulAuth(accessToken: string): void {
    this.saveToken(accessToken);
  }

  public clearLocalState(navigate = true): void {
    this.clearToken();
    if (navigate) {
      this.router.navigate(['/auth/login']);
    }
  }

  public refresh(): Observable<AuthApiResponse> {
    return this.http.post<AuthApiResponse>(`${AUTH_SERVER_URL}auth/refresh`, null, {
      withCredentials: true,
    });
  }

  public getNewTokenOrWait(): Observable<string> {
    if (!this.refreshChain$) {
      this.refreshChain$ = this.refresh().pipe(
        map((response) => {
          this.handleSuccessfulAuth(response.accessToken);

          return response.accessToken;
        }),
        catchError((error: unknown) => {
          this.clearLocalState();

          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshChain$ = null;
        }),
        shareReplay(1),
      );
    }

    return this.refreshChain$;
  }

  public logout(): Observable<unknown> {
    this.clearLocalState();

    return this.http.post(`${AUTH_SERVER_URL}auth/logout`, null, {
      withCredentials: true,
    });
  }
}
