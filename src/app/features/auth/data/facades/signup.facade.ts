import { inject, Service, signal } from '@angular/core';
import { AuthApiService } from '@features/auth/api/auth-api.service';
import { SignupFormService } from '../services/signup-form.service';
import { submit } from '@angular/forms/signals';

@Service({ autoProvided: false })
export class SignUpFacade {
  private readonly authApiService = inject(AuthApiService);
  private readonly signupFormService = inject(SignupFormService);
  private readonly signupFormModel = this.signupFormService.signupFormModel;

  public readonly signupForm = this.signupFormService.signupForm;
  public readonly isLoading = signal(false);

  public onSignUpSubmit() {
    this.isLoading.set(true);

    submit(this.signupForm, async () => {
      localStorage.setItem('loginFormData', JSON.stringify(this.signupFormModel()));

      this.isLoading.set(false);

      return null;
    });
  }
}
