import type { ValidationErrors } from '@angular/forms';
import { EMAIL_PATTERN } from '@shared/constants/patterns-constants';

export function emailValidator(value: string): ValidationErrors | null {
  return EMAIL_PATTERN.test(value) ? null : { invalidEmail: true };
}
