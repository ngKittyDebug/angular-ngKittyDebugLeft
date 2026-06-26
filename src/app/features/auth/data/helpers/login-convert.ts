import type { CredentialsApiData } from '../models/credentials-api-data';
import type { LoginFormGroup } from '../models/login/login-form.model';
import { isValidEmail } from './is-valid-email';
import { isValidUserName } from './is-valid-username';

export const convertLoginFormModelToCredentialsApiData = (
  loginFormGroup: LoginFormGroup,
): CredentialsApiData => {
  return {
    email: isValidEmail(loginFormGroup.nameOrEmail.value) ? loginFormGroup.nameOrEmail.value : '',
    username: isValidUserName(loginFormGroup.nameOrEmail.value)
      ? loginFormGroup.nameOrEmail.value
      : '',
    password: loginFormGroup.password.value,
  };
};
