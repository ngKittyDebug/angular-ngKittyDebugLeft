import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiError, TuiInput, TuiLabel, TuiTextfieldComponent } from '@taiga-ui/core';
import { TuiForm } from '@taiga-ui/layout';
import { FormField } from '@angular/forms/signals';
import { SignupFormService } from '@features/auth/data/services/signup-form.service';

@Component({
  selector: 'left-paw-signup-form',
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
}

// import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
// import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
// import { RouterLink } from '@angular/router';
// import { TranslocoDirective } from '@jsverse/transloco';
// import { TuiButton, TuiError, TuiInput, TuiLabel, TuiTextfieldComponent } from '@taiga-ui/core';
// import { TuiForm } from '@taiga-ui/layout';

// @Component({
//   selector: 'left-paw-signup-form',
//   imports: [
//     RouterLink,
//     ReactiveFormsModule,
//     TuiTextfieldComponent,
//     TuiButton,
//     TuiInput,
//     TuiLabel,
//     TuiForm,
//     TuiError,
//     TranslocoDirective,
//   ],
//   templateUrl: './signup-form.component.html',
//   styleUrl: './signup-form.component.scss',
//   changeDetection: ChangeDetectionStrategy.OnPush,
// })
// export class SignupFormComponent {
//   private readonly fb = inject(FormBuilder);

//   public readonly registrationForm = this.fb.nonNullable.group({
//     username: ['', Validators.required],
//     email: ['', Validators.required],
//     password: ['', Validators.required],
//     passwordRepeat: ['', Validators.required],
//   });

//   protected loginRouterPath = '../login';

//   protected submit(): void {
//     if (this.registrationForm.invalid) {
//       return;
//     }
//     const formData = this.registrationForm.getRawValue();

//     localStorage.setItem('loginFormData', JSON.stringify(formData));
//   }
// }
