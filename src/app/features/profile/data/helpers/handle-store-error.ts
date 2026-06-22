import { patchState, type WritableStateSource } from '@ngrx/signals';
import type { UserState } from '../models/profile.model';
import { catchError, of } from 'rxjs';

export function handleStoreError(store: WritableStateSource<UserState>) {
  return catchError((error: unknown) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    patchState(store, { isLoading: false, error: errorMessage });

    return of(null);
  });
}
