import type { LoginApiModel } from '../models/login/login-api-model';
import type { LoginFormGroup } from '../models/login/login-form.model';

export const convertLoginFormModelToLoginApiModel = (
  loginFormGroup: LoginFormGroup,
): LoginApiModel => {
  return {
    email: loginFormGroup.nameOrEmail.value,
    password: loginFormGroup.password.value,
  };
};
