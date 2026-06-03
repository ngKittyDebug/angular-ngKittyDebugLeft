import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { PASSWORD_PATTERN } from '@shared/constants/patterns-constants';
import type { LoginFormGroup } from '../models/login-form.model';
import { emailValidator } from '../helpers/email-validator';
import { userNameValidator } from '../helpers/username-validator';

@Injectable()
export class LoginFormService {
  private readonly fb = inject(FormBuilder);

  public readonly loginForm = this.fb.nonNullable.group<LoginFormGroup>({
    nameOrEmail: this.fb.nonNullable.control('', [
      Validators.required,
      userNameValidator(),
      emailValidator(),
    ]),
    password: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.pattern(PASSWORD_PATTERN),
    ]),
  });
}
