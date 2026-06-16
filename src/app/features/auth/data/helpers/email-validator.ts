import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { EMAIL_PATTERN } from '@shared/constants/patterns-constants';

export function emailValidator(): ValidatorFn;
export function emailValidator(email: string): boolean;

export function emailValidator(email?: string) {
  if (email) {
    return EMAIL_PATTERN.test(email);
  }

  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }
    const hasAtSymbol = value.includes('@');

    if (hasAtSymbol) {
      return EMAIL_PATTERN.test(value) ? null : { invalidEmail: true };
    } else {
      return null;
    }
  };
}
