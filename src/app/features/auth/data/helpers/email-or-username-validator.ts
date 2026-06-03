import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { userNameValidator } from './username-validator';
import { emailValidator } from './email-validator';

export function emailOrUserNameValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const hasAtSymbol = value.includes('@');

    if (hasAtSymbol) {
      return emailValidator(value);
    } else {
      return userNameValidator(value);
    }
  };
}
