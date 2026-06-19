import { DestroyRef, inject, Service, signal } from '@angular/core';
import { AuthApiService } from '@features/auth/api/auth-api.service';
import { SignupFormService } from '../services/signup-form.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Service({ autoProvided: false })
export class SignUpFacade {
  private readonly authApiService = inject(AuthApiService);
  private readonly signupFormService = inject(SignupFormService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly tokenService = inject(AuthService);

  private readonly signupFormModel = this.signupFormService.signupFormModel;

  public readonly signupForm = this.signupFormService.signupForm;
  public readonly isLoading = signal(false);

  public onSignUpSubmit(returnUrl: string) {
    this.isLoading.set(true);

    this.authApiService
      .registration(this.signupFormModel())
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
