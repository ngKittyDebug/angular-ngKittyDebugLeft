import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LoginFormService } from '@features/auth/data/services/login-form.service';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiError, TuiInput, TuiLabel, TuiTextfieldComponent } from '@taiga-ui/core';
import { TuiForm } from '@taiga-ui/layout';

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
})
export class LoginFormComponent {
  private readonly loginFormService = inject(LoginFormService);
  public readonly loginFormGroup = this.loginFormService.loginFormGroup;

  protected submit(): void {
    if (this.loginFormGroup.invalid) {
      return;
    }

    const formData = this.loginFormGroup.getRawValue();

    localStorage.setItem('loginFormData', JSON.stringify(formData));
  }
}
