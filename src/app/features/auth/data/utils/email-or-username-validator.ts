import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { EMAIL_PATTERN, USER_PATTERN } from '@shared/constants/patterns-constants';

export function emailOrUserNameValidator(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    const hasAtSymbol = value.includes('@');

    if (hasAtSymbol) {
      const emailRegex = EMAIL_PATTERN;
      const isValidEmail = emailRegex.test(value);

      return isValidEmail ? null : { invalidEmail: true };
    } else {
      const userNameRegex = USER_PATTERN;
      const isValidUserName = userNameRegex.test(value);

      return isValidUserName ? null : { isValidUserName: true };
    }
  };
}
