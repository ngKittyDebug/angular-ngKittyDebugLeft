import type { AbstractControl, ValidationErrors } from '@angular/forms';
import { USER_PATTERN } from '@shared/constants/patterns-constants';

export function isValidUserName(email: string): boolean {
  return USER_PATTERN.test(email);
}

export function userNameValidator() {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }
    const hasAtSymbol = value.includes('@');

    if (!hasAtSymbol) {
      return USER_PATTERN.test(value) ? null : { invalidUserName: true };
    } else {
      return null;
    }
  };
}
