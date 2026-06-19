import { DestroyRef, inject, Service, signal } from '@angular/core';
import { LoginFormService } from '../services/login-form.service';
import { AuthApiService } from '@features/auth/api/auth-api.service';
import type { LoginFormGroup } from '../models/login/login-form.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Service({ autoProvided: false })
export class LoginFacade {
  private readonly authApiService = inject(AuthApiService);
  private readonly loginFormService = inject(LoginFormService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly tokenService = inject(AuthService);

  public readonly isLoading = signal(false);

  public readonly loginForm = this.loginFormService.loginForm;

  public onLoginSubmit(loginFormGroup: LoginFormGroup, returnUrl: string) {
    this.isLoading.set(true);

    this.authApiService
      .login(loginFormGroup)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          //TODO тут будем сетапить в отдельный AuthService вместо локал стораджа
          localStorage.setItem('accessToken', JSON.stringify(data));
          this.tokenService.saveToken(data.accessToken);
          this.router.navigateByUrl(returnUrl);
          console.log(this.tokenService.token());
        },
      });
  }
}
