import { httpResource } from '@angular/common/http';
import { computed, inject, Service } from '@angular/core';
import { PokemonApiService } from '@core/api/pokemon-api.service';
import { AuthService } from '@core/services/auth.service';
import type { PokemonDetailApiData } from '@shared/models/pokemon-detail-api-data-interface';
import type {
  ChangePasswordModel,
  UpdateAvatarModel,
  UpdateUserModel,
} from '../models/profile.model';
import { UserProfileStore } from '../store/profile.store';

@Service()
export class ProfileFacade {
  private readonly store = inject(UserProfileStore);
  private readonly authService = inject(AuthService);
  private readonly pokemonApiService = inject(PokemonApiService);

  private readonly firstPokemonResource = httpResource<PokemonDetailApiData>(() =>
    this.pokemonApiService.getPokemonData('1'),
  );

  public readonly profile = this.store.profile;
  public readonly favoritePokemonList = this.store.favoritePokemonList;
  public readonly isLoading = this.store.isLoading;
  public readonly error = this.store.error;
  public readonly isPasswordChangedSuccess = this.store.isPasswordChangedSuccess;
  public readonly isAccountDeleted = this.store.isAccountDeleted;

  public readonly avatarUrl = computed(
    () =>
      this.profile()?.avatar ||
      this.firstPokemonResource.value()?.sprites.other['official-artwork'].front_default ||
      '',
  );

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

  public updateAvatar(data: UpdateAvatarModel): void {
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
