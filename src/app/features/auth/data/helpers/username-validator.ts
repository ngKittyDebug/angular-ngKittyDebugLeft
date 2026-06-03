import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { USER_PATTERN } from '@shared/constants/patterns-constants';

export function userNameValidator(): ValidatorFn {
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
