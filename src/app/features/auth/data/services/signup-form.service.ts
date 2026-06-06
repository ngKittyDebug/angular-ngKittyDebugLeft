import { Injectable, signal } from '@angular/core';
import type { SignUpData } from '../models/signup-form.model';
import { form } from '@angular/forms/signals';

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

  public readonly signupForm = form(this.signupModel);

  public handleForSubmit(event: Event): void {
    event.preventDefault();

    const data = this.signupModel();

    localStorage.setItem('loginFormDataSignal', JSON.stringify(data));
  }
}
