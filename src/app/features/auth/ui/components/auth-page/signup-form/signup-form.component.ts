import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiError, TuiInput, TuiLabel, TuiTextfieldComponent } from '@taiga-ui/core';
import { TuiForm } from '@taiga-ui/layout';
import type { Field } from '@angular/forms/signals';
import { FormField } from '@angular/forms/signals';
import { SignupFormService } from '@features/auth/data/services/signup-form.service';

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
})
export class SignupFormComponent {
  protected readonly signupFormService = inject(SignupFormService);

  protected loginRouterPath = '../login';

  protected firstErrorKey(field: Field<string>): string | null {
    const state = field();

    return state.touched() ? (state.errors()[0]?.message ?? null) : null;
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.signupFormService.submitForm();
  }
}
