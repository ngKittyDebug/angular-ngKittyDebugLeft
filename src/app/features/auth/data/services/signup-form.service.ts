import { Injectable, signal } from '@angular/core';
import type { SignupModel } from '../models/signup/signup-form.model';
import { form, pattern, required, validate } from '@angular/forms/signals';
import {
  EMAIL_PATTERN,
  PASSWORD_PATTERN,
  USER_PATTERN,
} from '@shared/constants/patterns-constants';

@Injectable()
export class SignupFormService {
  public readonly signupFormModel = signal<SignupModel>({
    userName: '',
    email: '',
    password: '',
    repeatPassword: '',
  });

  public readonly signupForm = form(this.signupFormModel, (schemaPath) => {
    required(schemaPath.userName, { message: 'auth.errorMessages.usernameRequired' });
    pattern(schemaPath.userName, USER_PATTERN, {
      message: 'auth.errorMessages.username',
    });
    required(schemaPath.email, { message: 'auth.errorMessages.emailRequired' });
    pattern(schemaPath.email, EMAIL_PATTERN, {
      message: 'auth.errorMessages.email',
    });
    required(schemaPath.password, { message: 'auth.errorMessages.passwordRequired' });
    pattern(schemaPath.password, PASSWORD_PATTERN, {
      message: 'auth.errorMessages.password',
    });
    required(schemaPath.repeatPassword, {
      message: 'auth.errorMessages.repeatPasswordRequired',
    });
    pattern(schemaPath.repeatPassword, PASSWORD_PATTERN, {
      message: 'auth.errorMessages.password',
    });
    validate(schemaPath.repeatPassword, (context) => {
      const originalPassword = context.valueOf(schemaPath.password);
      const repeatedPassword = context.value();

      if (originalPassword && repeatedPassword && originalPassword !== repeatedPassword) {
        return {
          kind: 'mismatch',
          message: 'auth.errorMessages.matchPassword',
        };
      }

      return null;
    });
  });
}
