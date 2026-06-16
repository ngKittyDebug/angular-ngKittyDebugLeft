import type { LoginApiModel } from '../models/login/login-api-model';
import type { LoginFormGroup } from '../models/login/login-form.model';
import { emailValidator } from './email-validator';
import { userNameValidator } from './username-validator';

export const convertLoginFormModelToLoginApiModel = (
  loginFormGroup: LoginFormGroup,
): LoginApiModel => {
  return {
    email: emailValidator(loginFormGroup.nameOrEmail.value) ? loginFormGroup.nameOrEmail.value : '',
    username: userNameValidator(loginFormGroup.nameOrEmail.value)
      ? loginFormGroup.nameOrEmail.value
      : '',
    password: loginFormGroup.password.value,
  };
};
