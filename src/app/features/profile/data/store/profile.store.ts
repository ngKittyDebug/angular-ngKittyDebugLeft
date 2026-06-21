import { inject } from '@angular/core';
import type {
  ChangePasswordModel,
  UpdateAvatar,
  UpdateUserModel,
  UserState,
} from '../models/profile.model';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, concatMap, of, pipe, switchMap, tap } from 'rxjs';
import { ProfileService } from '../services/profile.service';

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
            catchError((error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';

              patchState(store, { isLoading: false, error: errorMessage });

              return of(null);
            }),
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
              patchState(store, { profile: updatedProfile, isLoading: false });
            }),
            catchError((error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';

              patchState(store, { isLoading: false, error: errorMessage });

              return of(null);
            }),
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
            catchError((error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';

              patchState(store, { isLoading: false, error: errorMessage });

              return of(null);
            }),
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
            catchError((error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';

              patchState(store, { isLoading: false, error: errorMessage });

              return of(null);
            }),
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
                  profile: { ...currentProfile, avatarUrl: resource.avatar },
                  isLoading: false,
                });
              }
            }),
            catchError((error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';

              patchState(store, { isLoading: false, error: errorMessage });

              return of(null);
            }),
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
            catchError((error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';

              patchState(store, { isLoading: false, error: errorMessage });

              return of(null);
            }),
          ),
        ),
      ),
    ),

    addToFavorites: rxMethod<string>(
      pipe(
        concatMap((pokemonName) =>
          api.addFavorite(pokemonName).pipe(
            tap(() => {
              const current = store.favoritePokemonList();

              patchState(store, {
                favoritePokemonList: [...current, pokemonName],
                isLoading: false,
              });
            }),
            catchError((error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';

              patchState(store, { isLoading: false, error: errorMessage });

              return of(null);
            }),
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
            catchError((error: unknown) => {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';

              patchState(store, { isLoading: false, error: errorMessage });

              return of(null);
            }),
          ),
        ),
      ),
    ),
  })),
);
