import type { CredentialsApiData } from '../models/credentials-api-data';
import type { LoginFormGroup } from '../models/login/login-form.model';
import { emailValidator } from './email-validator';
import { userNameValidator } from './username-validator';

export const convertLoginFormModelToCredentialsApiData = (
  loginFormGroup: LoginFormGroup,
): CredentialsApiData => {
  return {
    email: emailValidator(loginFormGroup.nameOrEmail.value) ? loginFormGroup.nameOrEmail.value : '',
    username: userNameValidator(loginFormGroup.nameOrEmail.value)
      ? loginFormGroup.nameOrEmail.value
      : '',
    password: loginFormGroup.password.value,
  };
};
