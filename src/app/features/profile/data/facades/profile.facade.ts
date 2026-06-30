import { inject, Service } from '@angular/core';
import { ACCESS_TOKEN_KEY } from '@core/constants/auth-constants';
import type { ChangePasswordModel, UpdateAvatar, UpdateUserModel } from '../models/profile.model';
import { UserProfileStore } from '../store/profile.store';

@Service()
export class ProfileFacade {
  private readonly store = inject(UserProfileStore);

  public readonly profile = this.store.profile;
  public readonly isLoading = this.store.isLoading;
  public readonly error = this.store.error;
  public readonly isPasswordChangedSuccess = this.store.isPasswordChangedSuccess;

  public loadProfile(): void {
    this.store.loadProfile();
  }

  public updateProfile(data: UpdateUserModel): void {
    this.store.updateProfile(data);
  }

  public updateAvatar(data: UpdateAvatar): void {
    this.store.updateAvatar(data);
  }

  public changePassword(data: ChangePasswordModel): void {
    this.store.changePassword(data);
  }

  public deleteAccount(): void {
    this.store.deleteAccount();
  }

  public logout(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}
