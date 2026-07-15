import { inject, Service } from '@angular/core';
import { AuthService } from '@core/services/auth.service';
import type { ChangePasswordModel, UpdateAvatar, UpdateUserModel } from '../models/profile.model';
import { UserProfileStore } from '../store/profile.store';

@Service()
export class ProfileFacade {
  private readonly store = inject(UserProfileStore);
  private readonly authService = inject(AuthService);

  public readonly profile = this.store.profile;
  public readonly favoritePokemonList = this.store.favoritePokemonList;
  public readonly isLoading = this.store.isLoading;
  public readonly error = this.store.error;
  public readonly isPasswordChangedSuccess = this.store.isPasswordChangedSuccess;
  public readonly isAccountDeleted = this.store.isAccountDeleted;

  public loadProfile(): void {
    this.store.loadProfile();
  }

  public loadFavorites(): void {
    this.store.loadFavorites();
  }

  public addToFavorites(pokemonName: string): void {
    this.store.addToFavorites(pokemonName);
  }

  public removeFromFavorites(pokemonName: string): void {
    this.store.removeFromFavorites(pokemonName);
  }

  public toggleFavorite(pokemonName: string): void {
    const isFavorite = (this.favoritePokemonList() ?? []).some(
      (name) => name.toLowerCase() === pokemonName.toLowerCase(),
    );

    if (isFavorite) {
      this.removeFromFavorites(pokemonName);

      return;
    }

    this.addToFavorites(pokemonName);
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
    this.authService.logout();
  }
}
