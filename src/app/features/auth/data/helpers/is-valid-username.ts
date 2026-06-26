import { USER_PATTERN } from '@shared/constants/patterns-constants';

export function isValidUserName(username: string): boolean {
  return USER_PATTERN.test(username);
}
