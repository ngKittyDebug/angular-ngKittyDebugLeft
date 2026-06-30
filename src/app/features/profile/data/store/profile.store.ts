import { inject } from '@angular/core';
import type {
  ChangePasswordModel,
  UpdateAvatar,
  UpdateUserModel,
  UserState,
} from '../models/profile.model';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, pipe, switchMap, tap } from 'rxjs';
import { ProfileService } from '../services/profile.service';
import { handleStoreError } from '../helpers/handle-store-error';

const initialState: UserState = {
  profile: null,
  favoritePokemonList: [],
  isLoading: false,
  error: null,
  isPasswordChangedSuccess: false,
};

export const UserProfileStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, api = inject(ProfileService)) => ({
    loadProfile: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap(() =>
          api.getUser().pipe(
            tap((profile) => {
              patchState(store, { profile: profile, isLoading: false });
            }),
            handleStoreError(store),
          ),
        ),
      ),
    ),
    updateProfile: rxMethod<UpdateUserModel>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((dto) =>
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
        switchMap((dto) =>
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
        switchMap(() =>
          api.deleteAccount().pipe(
            tap(() => patchState(store, initialState)),
            handleStoreError(store),
          ),
        ),
      ),
    ),
    updateAvatar: rxMethod<UpdateAvatar>(
      pipe(
        tap(() => patchState(store, { isLoading: true, error: null })),
        switchMap((dto) =>
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
            tap(() => {
              const current = store.favoritePokemonList();

              patchState(store, {
                favoritePokemonList: [...current, pokemonName],
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
            tap(() => {
              const current = store.favoritePokemonList();
              const updated = current.filter((name) => name !== pokemonName);

              patchState(store, { favoritePokemonList: updated, isLoading: false });
            }),
            handleStoreError(store),
          ),
        ),
      ),
    ),
  })),
);
