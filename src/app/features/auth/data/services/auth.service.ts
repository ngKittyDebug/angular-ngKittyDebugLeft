import { computed, inject, Service, signal } from '@angular/core';
import type { LoginFormGroup } from '../models/login-form.model';
import type { Observable } from 'rxjs';
import { map, tap } from 'rxjs';
import { AuthApiService } from '@features/auth/api/auth-api.service';
import type { SignupModel } from '../models/signup-form.model';

@Service()
export class AuthService {
  private readonly authApiService = inject(AuthApiService);

  private readonly accessToken = signal<string | null>(null);

  public readonly getToken = computed(() => this.accessToken());

  // TODO на этапе мержа перепроверить и в случае необходимости исправить типы. Разработка велась одновременно с сервисом.
  public login(loginFormGroup: LoginFormGroup): Observable<void> {
    return this.authApiService.onAuthSubmit(loginFormGroup).pipe(
      tap((response) => {
        if (response.accessToken) {
          this.saveToken(response.accessToken);
        }
      }),
      map(() => void 0),
    );
  }

  // TODO на этапе мержа перепроверить и в случае необходимости исправить типы. Разработка велась одновременно с сервисом.
  public register(registerFormGroup: SignupModel): Observable<void> {
    return this.authApiService.onRegistrationSubmit(registerFormGroup).pipe(
      tap((response) => {
        if (response && response.accessToken) {
          this.saveToken(response.accessToken);
        }
      }),
      map(() => void 0),
    );
  }

  public refresh(): Observable<void> {
    return this.authApiService.onRefresh().pipe(
      tap((response) => {
        if (response && response.accessToken) {
          this.saveToken(response.accessToken);
        }
      }),
      map(() => void 0),
    );
  }

  public logout(): Observable<void> {
    return this.authApiService.onLogout().pipe(
      tap(() => {
        this.clearToken();
      }),
      map(() => void 0),
    );
  }

  private saveToken(token: string): void {
    this.accessToken.set(token);
  }

  private clearToken(): void {
    this.accessToken.set(null);
  }
}
