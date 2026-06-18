import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AUTH_SERVER_URL_TOKEN } from '@core/tokens/auth-server-url.token';
import type { LoginFormGroup } from '@features/auth/data/models/login/login-form.model';
import { convertLoginFormModelToCredentialsApiData } from '../data/helpers/login-convert';
import type { SignupModel } from '../data/models/signup/signup-form.model';
import { convertSignUpModelToCredentialsApiData } from '../data/helpers/signup-convert';

@Service({ autoProvided: false })
export class AuthApiService {
  private readonly authURLToken = inject<string>(AUTH_SERVER_URL_TOKEN);
  private readonly httpClient = inject(HttpClient);

  public login(loginFormGroup: LoginFormGroup) {
    const convertedLoginModel = convertLoginFormModelToCredentialsApiData(loginFormGroup);

    return this.httpClient.post(`${this.authURLToken}auth/login`, convertedLoginModel, {
      withCredentials: true,
    });
  }

  public registration(signupModel: SignupModel) {
    const convertedSignUpModel = convertSignUpModelToCredentialsApiData(signupModel);

    return this.httpClient.post(`${this.authURLToken}auth/register`, convertedSignUpModel, {
      withCredentials: true,
    });
  }
}
