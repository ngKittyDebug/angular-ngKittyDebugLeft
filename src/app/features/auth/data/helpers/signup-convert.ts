import type { SignUpApiModel } from '../models/signup/signup-api-model';
import type { SignupModel } from '../models/signup/signup-form.model';

export const convertSignUpModelToSignUpApiModel = (signupModel: SignupModel): SignUpApiModel => {
  return {
    email: signupModel.email,
    username: signupModel.userName,
    password: signupModel.password,
  };
};
