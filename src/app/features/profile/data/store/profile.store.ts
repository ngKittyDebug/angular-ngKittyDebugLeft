import { inject } from '@angular/core';
import type {
  ChangePasswordModel,
  UpdateAvatarModel,
  UpdateUserModel,
  UserState,
} from '../models/profile.model';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, exhaustMap, pipe, switchMap, tap } from 'rxjs';
import { UserApiService } from '../services/user-api.service';
import { extractFavoritePokemonList } from '../helpers/extract-favorite-pokemon-list';
import { handleStoreError } from '../helpers/handle-store-error';

const initialState: UserState = {
  profile: null,
  favoritePokemonList: [],
  isLoading: false,
  error: null,
  isPasswordChangedSuccess: false,
  isAccountDeleted: false,
};

export const UserProfileStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, api = inject(UserApiService)) => ({
    loadProfile: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null, isAccountDeleted: false })),
        switchMap(() =>
          api.getUser().pipe(
            tap((profile) => {
              patchState(store, {
                profile: profile,
                favoritePokemonList: profile.pokemonNameFavoriteList,
                isLoading: false,
              });
            }),
            handleStoreError(store),
          ),
        ),
      ),
    ),
    updateProfile: rxMethod<UpdateUserModel>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        exhaustMap((dto) =>
          api.updateUser(dto).pipe(
            tap((updatedProfile) => {
              const current = store.profile();

              patchState(store, {
                profile: current ? { ...current, ...updatedProfile } : updatedProfile,
                isLoading: false,
              });
            }),
            handleStoreError(store),
          ),
        ),
      ),
    ),
    changePassword: rxMethod<ChangePasswordModel>(
      pipe(
        tap(() =>
          patchState(store, { isLoading: true, error: null, isPasswordChangedSuccess: false }),
        ),
        exhaustMap((dto) =>
          api.changePassword(dto).pipe(
            tap(() => {
              patchState(store, { isLoading: false, isPasswordChangedSuccess: true });
            }),
            handleStoreError(store),
          ),
        ),
      ),
    ),
    deleteAccount: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        exhaustMap(() =>
          api.deleteAccount().pipe(
            tap(() => patchState(store, { ...initialState, isAccountDeleted: true })),
            handleStoreError(store),
          ),
        ),
      ),
    ),
    updateAvatar: rxMethod<UpdateAvatarModel>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        exhaustMap((dto) =>
          api.updateAvatar(dto).pipe(
            tap((resource) => {
              const currentProfile = store.profile();

              if (currentProfile) {
                patchState(store, {
                  profile: { ...currentProfile, avatar: resource.avatar },
                  isLoading: false,
                });
              }
            }),
            handleStoreError(store),
          ),
        ),
      ),
    ),
    loadFavorites: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          api.getFavorites().pipe(
            tap((favorites) =>
              patchState(store, { favoritePokemonList: favorites, isLoading: false }),
            ),
            handleStoreError(store),
          ),
        ),
      ),
    ),

    addToFavorites: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        concatMap((pokemonName) =>
          api.addFavorite(pokemonName).pipe(
            tap((response) => {
              const favorites = extractFavoritePokemonList(response);
              const currentProfile = store.profile();

              patchState(store, {
                favoritePokemonList: favorites,
                profile: currentProfile
                  ? { ...currentProfile, pokemonNameFavoriteList: favorites }
                  : currentProfile,
                isLoading: false,
              });
            }),
            handleStoreError(store),
          ),
        ),
      ),
    ),

    removeFromFavorites: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        concatMap((pokemonName) =>
          api.removeFavorite(pokemonName).pipe(
            tap((response) => {
              const favorites = extractFavoritePokemonList(response);
              const currentProfile = store.profile();

              patchState(store, {
                favoritePokemonList: favorites,
                profile: currentProfile
                  ? { ...currentProfile, pokemonNameFavoriteList: favorites }
                  : currentProfile,
                isLoading: false,
              });
            }),
            handleStoreError(store),
          ),
        ),
      ),
    ),
  })),
);
