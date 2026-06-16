import { computed, inject, Service, signal } from '@angular/core';
import type { LoginFormGroup } from '../models/login-form.model';
import type { Observable } from 'rxjs';
import { map, tap } from 'rxjs';
import { AuthApiService } from '@features/auth/api/auth-api.service';

@Service()
export class AuthService {
  private readonly authApiService = inject(AuthApiService);

  private readonly accessToken = signal<string | null>(null);

  public readonly getToken = computed(() => this.accessToken());

  public login(loginFormGroup: LoginFormGroup): Observable<void> {
    return this.authApiService.onAuthSubmit(loginFormGroup).pipe(
      tap((response) => {
        if (response.accessToken) {
          this.accessToken.set(response.accessToken);
        }
      }),
      map(() => void 0),
    );
  }

  public register() {}

  public refresh() {}

  public logout() {}

  private saveToken(token: string): void {
    this.accessToken.set(token);
  }

  private clearToken(): void {
    this.accessToken.set(null);
  }
}
