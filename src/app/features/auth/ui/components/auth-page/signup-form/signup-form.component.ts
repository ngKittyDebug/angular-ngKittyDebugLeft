import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiError, TuiInput, TuiLabel, TuiTextfieldComponent } from '@taiga-ui/core';
import { TuiForm } from '@taiga-ui/layout';
import type { Field } from '@angular/forms/signals';
import { FormField } from '@angular/forms/signals';
import { AUTH_SERVER_URL_TOKEN } from '@core/tokens/auth-server-url.token';
import { AuthApiService } from '@features/auth/api/auth-api.service';
import { SignUpFacade } from '@features/auth/data/facades/signup.facade';
import { AUTH_SERVER_URL } from '@core/constants/auth-constants';

@Component({
  selector: 'left-paw-signup-form',
  imports: [
    RouterLink,
    TuiTextfieldComponent,
    TuiButton,
    TuiInput,
    TuiLabel,
    TuiForm,
    TuiError,
    TranslocoDirective,
    FormField,
    FormsModule,
  ],
  templateUrl: './signup-form.component.html',
  styleUrl: './signup-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    AuthApiService,
    SignUpFacade,
    { provide: AUTH_SERVER_URL_TOKEN, useValue: AUTH_SERVER_URL },
  ],
})
export class SignupFormComponent {
  protected loginRouterPath = '../login';

  protected readonly signupFacade = inject(SignUpFacade);
  protected readonly isLoading = this.signupFacade.isLoading;

  protected readonly returnUrl = input<string>('/');

  protected firstErrorKey(field: Field<string>): string | null {
    const state = field();

    return state.touched() ? (state.errors()[0]?.message ?? null) : null;
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.signupFacade.onSignUpSubmit(this.returnUrl());
  }
}
