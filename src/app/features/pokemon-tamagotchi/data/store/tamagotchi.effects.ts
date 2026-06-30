import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, debounceTime, filter, map, of, switchMap, tap, withLatestFrom } from 'rxjs';
import { TamagotchiCloudSyncService } from '../services/tamagotchi-cloud-sync.service';
import { TamagotchiPersistenceService } from '../services/tamagotchi-persistence.service';
import * as TamagotchiActions from './tamagotchi.actions';
import { selectIsInitialized, selectTamagotchiState } from './tamagotchi.selectors';

const persistTriggerActions = [
  TamagotchiActions.addNotification,
  TamagotchiActions.applyStatusDecay,
  TamagotchiActions.careForPokemon,
  TamagotchiActions.checkEvolution,
  TamagotchiActions.clearPokemon,
  TamagotchiActions.closeMiniGame,
  TamagotchiActions.completeEvolution,
  TamagotchiActions.feedPokemon,
  TamagotchiActions.interactWithPokemon,
  TamagotchiActions.openMiniGame,
  TamagotchiActions.playWithPokemon,
  TamagotchiActions.putToSleep,
  TamagotchiActions.selectPokemon,
  TamagotchiActions.startEvolution,
  TamagotchiActions.trainPokemon,
  TamagotchiActions.updateStatus,
  TamagotchiActions.wakeUp,
  TamagotchiActions.waterPokemon,
] as const;

@Injectable()
export class TamagotchiEffects {
  private readonly actions$ = inject(Actions);
  private readonly cloudSync = inject(TamagotchiCloudSyncService);
  private readonly persistence = inject(TamagotchiPersistenceService);
  private readonly store = inject(Store);

  public readonly init$ = createEffect(() => of(TamagotchiActions.loadState()));

  public readonly loadState$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TamagotchiActions.loadState),
      map(() => {
        const loaded = this.persistence.load();

        if (!loaded) {
          return TamagotchiActions.initializeTamagotchi();
        }

        return TamagotchiActions.loadStateSuccess({
          state: {
            ...loaded.state,
            error: loaded.recoveredFromBackup ? 'State recovered from backup' : loaded.state.error,
          },
        });
      }),
      catchError(() =>
        of(
          TamagotchiActions.setError({ error: 'Failed to load tamagotchi state' }),
          TamagotchiActions.initializeTamagotchi(),
        ),
      ),
    ),
  );

  public readonly saveState$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TamagotchiActions.saveState),
      withLatestFrom(this.store.select(selectTamagotchiState)),
      switchMap(([, state]) => {
        try {
          this.persistence.save(state);
          const savedAt = Date.now();

          return this.cloudSync.sync(state).pipe(
            map(() => TamagotchiActions.saveStateSuccess({ cloudSynced: true, savedAt })),
            catchError(() =>
              of(TamagotchiActions.saveStateSuccess({ cloudSynced: false, savedAt })),
            ),
          );
        } catch {
          return of(TamagotchiActions.setError({ error: 'Failed to save tamagotchi state' }));
        }
      }),
    ),
  );

  public readonly persistOnChange$ = createEffect(() =>
    this.actions$.pipe(
      ofType(...persistTriggerActions),
      debounceTime(300),
      withLatestFrom(this.store.select(selectIsInitialized)),
      filter(([, initialized]) => initialized),
      map(() => TamagotchiActions.saveState()),
    ),
  );

  public readonly clearPersistence$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TamagotchiActions.clearPokemon, TamagotchiActions.resetState),
      tap(() => this.persistence.clear()),
      map(() => TamagotchiActions.saveState()),
    ),
  );
}
