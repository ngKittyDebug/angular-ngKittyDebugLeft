import { EMAIL_PATTERN } from '@shared/constants/patterns-constants';

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}
