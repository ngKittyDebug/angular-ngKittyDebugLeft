import type { FormControl } from '@angular/forms';

export interface LoginFormGroup {
  nameOrEmail: FormControl<string>;
  password: FormControl<string>;
}
