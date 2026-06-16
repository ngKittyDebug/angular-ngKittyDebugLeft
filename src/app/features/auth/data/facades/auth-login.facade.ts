import { inject, Service } from '@angular/core';
import { LoginFormService } from '../services/login-form.service';
import { AuthApiService } from '@features/auth/api/auth-api.service';
import type { LoginFormGroup } from '../models/login/login-form.model';

@Service({ autoProvided: false })
export class AuthLoginFacade {
  private authApiService = inject(AuthApiService);

  private readonly loginFormService = inject(LoginFormService);
  public readonly loginForm = this.loginFormService.loginForm;

  public onLoginSubmit = (loginFormGroup: LoginFormGroup) =>
    this.authApiService.onAuthSubmit(loginFormGroup);
}
