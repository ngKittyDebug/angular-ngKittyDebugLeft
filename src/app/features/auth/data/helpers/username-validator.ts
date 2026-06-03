import type { ValidationErrors } from '@angular/forms';
import { USER_PATTERN } from '@shared/constants/patterns-constants';

export function userNameValidator(value: string): ValidationErrors | null {
  return USER_PATTERN.test(value) ? null : { invalidUserName: true };
}
