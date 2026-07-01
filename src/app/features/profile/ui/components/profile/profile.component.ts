import type { OnInit } from '@angular/core';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton } from '@taiga-ui/core';
import { TuiAvatar, TuiButtonLoading } from '@taiga-ui/kit';
import {
  EMAIL_PATTERN,
  PASSWORD_PATTERN,
  USER_PATTERN,
} from '@shared/constants/patterns-constants';
import { ProfileFacade } from '../../../data/facades/profile.facade';
import { AvatarPickerComponent } from '../avatar-picker/avatar-picker.component';
import { PokemonCardProfileComponent } from '../pokemon-card-profile/pokemon-card-profile.component';
import { SettingRowComponent } from '../setting-row/setting-row.component';

@Component({
  selector: 'left-paw-profile',
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    AvatarPickerComponent,
    PokemonCardProfileComponent,
    SettingRowComponent,
    TuiAvatar,
    TuiButton,
    TuiButtonLoading,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private readonly router = inject(Router);

  protected readonly facade = inject(ProfileFacade);
  protected readonly passwordEditing = signal(false);
  protected readonly showDeleteConfirm = signal(false);
  protected readonly showAvatarPicker = signal(false);

  protected readonly usernameFormControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(USER_PATTERN)],
  });

  protected readonly usernamePasswordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(PASSWORD_PATTERN)],
  });

  protected readonly emailFormControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(EMAIL_PATTERN)],
  });

  protected readonly emailPasswordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(PASSWORD_PATTERN)],
  });

  protected readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(PASSWORD_PATTERN)],
    }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(PASSWORD_PATTERN)],
    }),
  });

  constructor() {
    effect(() => {
      const profile = this.facade.profile();

      if (!profile) {
        return;
      }

      this.usernameFormControl.setValue(profile.username, { emitEvent: false });
      this.emailFormControl.setValue(profile.email, { emitEvent: false });
    });

    effect(() => {
      if (!this.facade.error()) {
        return;
      }

      const profile = this.facade.profile();

      if (!profile) {
        return;
      }

      this.usernameFormControl.setValue(profile.username, { emitEvent: false });
      this.emailFormControl.setValue(profile.email, { emitEvent: false });
    });
  }

  public ngOnInit(): void {
    this.facade.loadProfile();
  }

  protected onSaveUsername(): void {
    this.facade.updateProfile({
      username: this.usernameFormControl.value,
      password: this.usernamePasswordControl.value,
    });
    this.usernamePasswordControl.reset();
  }

  protected onSaveEmail(): void {
    this.facade.updateProfile({
      email: this.emailFormControl.value,
      password: this.emailPasswordControl.value,
    });
    this.emailPasswordControl.reset();
  }

  protected onAvatarSelected(avatarUrl: string): void {
    this.facade.updateAvatar({ avatar: avatarUrl });
  }

  protected onSavePassword(): void {
    this.passwordForm.markAllAsTouched();

    if (this.passwordForm.invalid) {
      return;
    }

    const { currentPassword, newPassword } = this.passwordForm.value;

    if (!newPassword) {
      return;
    }

    this.facade.changePassword({ currentPassword: currentPassword || undefined, newPassword });
    this.passwordEditing.set(false);
    this.passwordForm.reset();
  }

  protected cancelPasswordEdit(): void {
    this.passwordEditing.set(false);
    this.passwordForm.reset();
  }

  protected onLogout(): void {
    this.facade.logout();
    void this.router.navigate(['/auth']);
  }

  protected onDeleteAccount(): void {
    this.facade.deleteAccount();
  }
}
