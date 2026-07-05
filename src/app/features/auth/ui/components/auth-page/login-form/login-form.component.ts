import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthApiService } from '@features/auth/api/auth-api.service';
import { AUTH_SERVER_URL_TOKEN } from '@core/tokens/auth-server-url.token';
import { LoginFacade } from '@features/auth/data/facades/login.facade';
import { TranslocoDirective } from '@jsverse/transloco';
import {
  TuiButton,
  TuiError,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiTextfieldComponent,
  TuiTextfieldOptionsDirective,
} from '@taiga-ui/core';
import { TuiPassword } from '@taiga-ui/kit';
import { TuiForm } from '@taiga-ui/layout';
import { AUTH_SERVER_URL } from '@core/constants/auth-constants';

@Component({
  selector: 'left-paw-login-form',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    TuiTextfieldComponent,
    TuiTextfieldOptionsDirective,
    TuiButton,
    TuiIcon,
    TuiInput,
    TuiLabel,
    TuiPassword,
    TuiForm,
    TuiError,
    TranslocoDirective,
  ],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    AuthApiService,
    LoginFacade,
    { provide: AUTH_SERVER_URL_TOKEN, useValue: AUTH_SERVER_URL },
  ],
})
export class LoginFormComponent {
  private readonly loginFacade = inject(LoginFacade);
  protected readonly loginForm = this.loginFacade.loginForm;
  protected readonly isLoading = this.loginFacade.isLoading;

  protected readonly returnUrl = input<string>('/');

  protected onLoginSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }
    this.loginFacade.onLoginSubmit(this.loginForm.controls, this.returnUrl());
  }
}
