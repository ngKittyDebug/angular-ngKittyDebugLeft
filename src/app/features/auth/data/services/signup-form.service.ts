import { Injectable, signal } from '@angular/core';
import type { SignUpData } from '../models/signup-form.model';

@Injectable()
export class SignupFormService {
  public readonly signupModel = signal<SignUpData>({
    userName: '',
    email: '',
    password: '',
    repeatPassword: '',
  });
}
