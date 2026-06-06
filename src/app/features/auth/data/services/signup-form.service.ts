import { Injectable, signal } from '@angular/core';
import type { SignUpData } from '../models/signup-form.model';
import { form, required, submit } from '@angular/forms/signals';

@Injectable({
  providedIn: 'root',
})
export class SignupFormService {
  public readonly signupModel = signal<SignUpData>({
    userName: '',
    email: '',
    password: '',
    repeatPassword: '',
  });

  public readonly signupForm = form(this.signupModel, (schemaPath) => {
    required(schemaPath.userName, { message: 'auth.signupErrorMessages.usernameRequired' });
    required(schemaPath.email, { message: 'auth.signupErrorMessages.emailRequired' });
    required(schemaPath.password, { message: 'auth.signupErrorMessages.passwordRequired' });
    required(schemaPath.repeatPassword, {
      message: 'auth.signupErrorMessages.repeatPasswordRequired',
    });
  });

  public handleForSubmit(event: Event): void {
    event.preventDefault();

    submit(this.signupForm, async () => {
      const data = this.signupModel();

      localStorage.setItem('loginFormDataSignal', JSON.stringify(data));

      return null;
    });
  }
}
