import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  TuiButton,
  TuiError,
  TuiIcon,
  TuiInput,
  TuiLabel,
  TuiLoader,
  TuiTextfieldComponent,
} from '@taiga-ui/core';
import { TuiPassword } from '@taiga-ui/kit';
import { TuiCardLarge, TuiForm } from '@taiga-ui/layout';

@Component({
  selector: 'left-paw-signup-form',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    TuiTextfieldComponent,
    TuiButton,
    TuiInput,
    TuiLabel,
    TuiIcon,
    TuiPassword,
    TuiCardLarge,
    TuiForm,
    TuiError,
    TuiLoader,
  ],
  templateUrl: './signup-form.component.html',
  styleUrl: './signup-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupFormComponent {
  private fb = inject(FormBuilder);

  public readonly registrationForm = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', Validators.required],
    password: ['', Validators.required],
    passwordRepeat: ['', Validators.required],
  });

  protected loginRouterPath = '../login';
}
