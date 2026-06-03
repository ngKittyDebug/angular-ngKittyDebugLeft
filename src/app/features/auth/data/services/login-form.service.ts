import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { emailOrUserNameValidator } from '../helpers/email-or-username-validator';
import { PASSWORD_PATTERN } from '@shared/constants/patterns-constants';
import type { LoginFormGroup } from '../models/login-form.model';

@Injectable()
export class LoginFormService {
  private readonly fb = inject(FormBuilder);

  public readonly loginForm = this.fb.nonNullable.group<LoginFormGroup>({
    nameOrEmail: this.fb.nonNullable.control('', [Validators.required, emailOrUserNameValidator()]),
    password: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(PASSWORD_PATTERN),
    ]),
  });
}
