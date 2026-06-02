import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

@Injectable()
export class LoginFormService {
  private readonly fb = inject(FormBuilder);

  public readonly loginFormGroup = this.fb.nonNullable.group({
    nameOrEmailFormControl: ['', Validators.required],
    passwordFormControl: ['', Validators.required],
  });
}
