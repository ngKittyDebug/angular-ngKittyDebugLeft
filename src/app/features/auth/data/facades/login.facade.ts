import type { InputSignal } from '@angular/core';
import { DestroyRef, inject, Service, signal } from '@angular/core';
import { LoginFormService } from '../services/login-form.service';
import { AuthApiService } from '@features/auth/api/auth-api.service';
import type { LoginFormGroup } from '../models/login/login-form.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';

@Service({ autoProvided: false })
export class LoginFacade {
  private readonly authApiService = inject(AuthApiService);
  private readonly loginFormService = inject(LoginFormService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  public readonly isLoading = signal(false);

  public readonly loginForm = this.loginFormService.loginForm;

  public onLoginSubmit = (loginFormGroup: LoginFormGroup, returnUrl: InputSignal<string>) => {
    this.isLoading.set(true);

    this.authApiService
      .onLoginSubmit(loginFormGroup)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          //TODO тут будем сетапить в отдельный AuthService вместо локал стораджа
          localStorage.setItem('loginFormData', JSON.stringify(data));
          this.router.navigateByUrl(returnUrl());
        },
        //TODO далее ошибки будем обрабатывать в отдельном сервисе, на консоль лог не обращайте внимание
        error: (error) => console.log(error),
      });
  };
}
