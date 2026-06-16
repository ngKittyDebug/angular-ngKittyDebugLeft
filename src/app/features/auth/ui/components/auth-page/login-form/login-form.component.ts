import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthApiService } from '@features/auth/api/auth-api.service';
import { AUTH_SERVER_URL } from '@core/constants/pokemon-constants';
import { AUTH_SERVER_URL_TOKEN } from '@core/tokens/auth-server-url.token';
import { AuthLoginFacade } from '@features/auth/data/facades/auth-login.facade';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiError, TuiInput, TuiLabel, TuiTextfieldComponent } from '@taiga-ui/core';
import { TuiForm } from '@taiga-ui/layout';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'left-paw-login-form',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    TuiTextfieldComponent,
    TuiButton,
    TuiInput,
    TuiLabel,
    TuiForm,
    TuiError,
    TranslocoDirective,
  ],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    AuthApiService,
    AuthLoginFacade,
    { provide: AUTH_SERVER_URL_TOKEN, useValue: AUTH_SERVER_URL },
  ],
})
export class LoginFormComponent {
  private readonly authLoginFacade = inject(AuthLoginFacade);
  private destroyRef = inject(DestroyRef);
  public readonly loginForm = this.authLoginFacade.loginForm;

  protected readonly isPending = signal(false);

  protected onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isPending.set(true);

    this.authLoginFacade
      .onLoginSubmit(this.loginForm.controls)
      .pipe(
        finalize(() => this.isPending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => localStorage.setItem('loginFormData', JSON.stringify(data)),
      });
  }
}
