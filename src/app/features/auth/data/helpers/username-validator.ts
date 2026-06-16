import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { USER_PATTERN } from '@shared/constants/patterns-constants';

export function userNameValidator(username: string): boolean;
export function userNameValidator(): ValidatorFn;

export function userNameValidator(username?: string) {
  if (username) {
    return USER_PATTERN.test(username);
  }

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
