import type { CredentialsApiData } from '../models/credentials-api-data';
import type { SignupModel } from '../models/signup/signup-form.model';

export const convertSignUpModelToCredentialsApiData = (
  signupModel: SignupModel,
): CredentialsApiData => {
  return {
    email: signupModel.email,
    username: signupModel.userName,
    password: signupModel.password,
  };
};
