import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { emailOrUserNameValidator } from '../utils/email-or-username-validator';
import { PASSWORD_PATTERN } from '@shared/constants/patterns-constants';

@Injectable()
export class LoginFormService {
  private readonly fb = inject(FormBuilder);

  public readonly loginFormGroup = this.fb.nonNullable.group({
    nameOrEmailFormControl: this.fb.control('', [Validators.required, emailOrUserNameValidator()]),
    passwordFormControl: this.fb.control('', [
      Validators.required,
      Validators.pattern(PASSWORD_PATTERN),
    ]),
  });
}
