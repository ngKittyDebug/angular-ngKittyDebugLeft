import { inject } from '@angular/core';
import type { UserState } from '../models/profile.model';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, of, pipe, switchMap, tap } from 'rxjs';
import { ProfileService } from '../services/profile.service';

const initialState: UserState = {
  profile: null,
  favoritePokemons: [],
  caughtPokemons: [],
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
  })),
);
