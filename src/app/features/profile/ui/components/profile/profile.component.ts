import { httpResource } from '@angular/common/http';
import type { OnInit, TemplateRef } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { TuiAvatar, TuiButtonLoading } from '@taiga-ui/kit';
import { PokemonApiService } from '@core/api/pokemon-api.service';
import {
  EMAIL_PATTERN,
  PASSWORD_PATTERN,
  USER_PATTERN,
} from '@shared/constants/patterns-constants';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
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
  private readonly dialogs = inject(TuiDialogService);
  private readonly pickerTemplate = viewChild.required<TemplateRef<unknown>>('pickerTemplate');
  private readonly pokemonApiService = inject(PokemonApiService);

  private readonly firstPokemonResource = httpResource<PokemonDetailApiData>(() =>
    this.pokemonApiService.getPokemonData('1'),
  );

  protected readonly facade = inject(ProfileFacade);
  protected readonly passwordEditing = signal(false);
  protected readonly showDeleteConfirm = signal(false);

  protected readonly avatarUrl = computed(
    () =>
      this.facade.profile()?.avatar ||
      this.firstPokemonResource.value()?.sprites.other['official-artwork'].front_default ||
      '',
  );

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
    effect(() => this.syncFormFromProfile());
    effect(() => {
      if (this.facade.error()) {
        this.syncFormFromProfile();
      }
    });
    effect(() => {
      if (this.facade.isAccountDeleted()) {
        this.endSession();
      }
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

  protected openAvatarPicker(label: string): void {
    this.dialogs
      .open<string>(this.pickerTemplate(), { label, size: 'l' })
      .subscribe((avatarUrl) => {
        this.facade.updateAvatar({ avatar: avatarUrl });
      });
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
    this.endSession();
  }

  protected onDeleteAccount(): void {
    this.facade.deleteAccount();
  }

  private endSession(): void {
    this.facade.logout();
    void this.router.navigate(['/auth']);
  }

  private syncFormFromProfile(): void {
    const profile = this.facade.profile();

    if (!profile) {
      return;
    }

    this.usernameFormControl.setValue(profile.username, { emitEvent: false });
    this.emailFormControl.setValue(profile.email, { emitEvent: false });
  }
}
