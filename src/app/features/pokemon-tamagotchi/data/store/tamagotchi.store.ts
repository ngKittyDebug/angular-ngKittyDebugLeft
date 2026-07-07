import { computed, DestroyRef, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { debounceTime, pipe, tap } from 'rxjs';
import { TAMAGOTCHI_SYSTEM_ERRORS } from '../constants/system-errors.constants';
import { calculateBondLevel } from '../helpers/gesture.helper';
import { sortNotificationsByPriority } from '../helpers/notification-factory.helper';
import { TamagotchiErrorRecoveryService } from '../services/tamagotchi-error-recovery.service';
import { TamagotchiPersistenceService } from '../services/tamagotchi-persistence.service';
import type { InteractionEventModel } from '../models/interaction.model';
import type { NotificationModel } from '../models/notification.model';
import type { PokemonModel } from '../models/pokemon.model';
import type { StatusDecayModel, StatusUpdateModel } from '../models/pokemon-status.model';
import type { TamagotchiStateModel } from '../models/tamagotchi-state.model';
import {
  addNotificationState,
  applyStatusDecayState,
  careForPokemonState,
  checkEvolutionState,
  clearErrorState,
  completeEvolutionState,
  completeTrainingState,
  feedPokemonState,
  initializeTamagotchiState,
  interactWithPokemonState,
  loadStateSuccessState,
  markEvolutionReadyNotifiedState,
  playWithPokemonState,
  putToSleepState,
  resetStateTransition,
  restartTrainingTimerState,
  saveStateSuccessState,
  selectPokemonState,
  setErrorState,
  startEvolutionState,
  startTrainingState,
  updateStatusState,
  wakeUpState,
  waterPokemonState,
} from './tamagotchi-state-transitions';
import { initialTamagotchiState } from './tamagotchi-initial';

const SAVE_DEBOUNCE_MS = 300;

export function snapshotState(store: {
  achievementList: () => TamagotchiStateModel['achievementList'];
  dailyRoutine: () => TamagotchiStateModel['dailyRoutine'];
  error: () => TamagotchiStateModel['error'];
  evolutionProgress: () => TamagotchiStateModel['evolutionProgress'];
  initialized: () => boolean;
  interactionHistory: () => TamagotchiStateModel['interactionHistory'];
  isEvolving: () => boolean;
  isSleeping: () => boolean;
  lastActionTime: () => TamagotchiStateModel['lastActionTime'];
  lastDecayTime: () => TamagotchiStateModel['lastDecayTime'];
  lastSaveTime: () => TamagotchiStateModel['lastSaveTime'];
  notificationList: () => TamagotchiStateModel['notificationList'];
  pokemon: () => TamagotchiStateModel['pokemon'];
  status: () => TamagotchiStateModel['status'];
  trainingExperienceReward: () => TamagotchiStateModel['trainingExperienceReward'];
  trainingStartedAt: () => TamagotchiStateModel['trainingStartedAt'];
}): TamagotchiStateModel {
  return {
    achievementList: store.achievementList(),
    dailyRoutine: store.dailyRoutine(),
    error: store.error(),
    evolutionProgress: store.evolutionProgress(),
    initialized: store.initialized(),
    interactionHistory: store.interactionHistory(),
    isEvolving: store.isEvolving(),
    isSleeping: store.isSleeping(),
    lastActionTime: store.lastActionTime(),
    lastDecayTime: store.lastDecayTime(),
    lastSaveTime: store.lastSaveTime(),
    notificationList: store.notificationList(),
    pokemon: store.pokemon(),
    status: store.status(),
    trainingExperienceReward: store.trainingExperienceReward(),
    trainingStartedAt: store.trainingStartedAt(),
  };
}

export const TamagotchiStore = signalStore(
  withState(initialTamagotchiState),
  withComputed((store) => ({
    hasPokemon: computed(() => store.pokemon() !== null),
    isTraining: computed(() => store.trainingStartedAt() !== null),
    canEvolve: computed(() => store.evolutionProgress().isReady && !store.isEvolving()),
    snapshot: computed(() => snapshotState(store)),
    unreadNotifications: computed(() =>
      sortNotificationsByPriority(
        store.notificationList().filter((notification) => !notification.read),
      ),
    ),
    bondLevel: computed(() => calculateBondLevel(store.interactionHistory())),
  })),
  withMethods(
    (
      store,
      errorRecovery = inject(TamagotchiErrorRecoveryService),
      persistence = inject(TamagotchiPersistenceService),
    ) => {
      let pendingSave = false;

      const performSave = (): void => {
        if (!store.initialized()) {
          return;
        }

        try {
          const state = snapshotState(store);

          persistence.save(state);
          const savedAt = Date.now();

          patchState(store, (current) => saveStateSuccessState(current, savedAt));
        } catch (error) {
          errorRecovery.logError('saveState', error);
          patchState(store, (current) =>
            setErrorState(current, TAMAGOTCHI_SYSTEM_ERRORS.SAVE_FAILED),
          );
        }
      };

      const saveStateDebounced = rxMethod<void>(
        pipe(
          debounceTime(SAVE_DEBOUNCE_MS),
          tap(() => {
            if (!pendingSave) {
              return;
            }

            pendingSave = false;
            performSave();
          }),
        ),
      );

      const scheduleSave = (): void => {
        if (!store.initialized()) {
          return;
        }

        pendingSave = true;
        saveStateDebounced();
      };

      const mutateAndSave = (
        update: (state: TamagotchiStateModel) => TamagotchiStateModel,
      ): void => {
        patchState(store, update);
        scheduleSave();
      };

      return {
        flushSave(): void {
          if (!pendingSave) {
            return;
          }

          pendingSave = false;
          performSave();
        },

        loadFromPersistence(): void {
          try {
            const loaded = persistence.load();

            if (!loaded) {
              patchState(store, initializeTamagotchiState);

              return;
            }

            patchState(store, (current) =>
              loadStateSuccessState(current, {
                ...loaded.state,
                error: loaded.recoveredFromBackup
                  ? TAMAGOTCHI_SYSTEM_ERRORS.RECOVERED_FROM_BACKUP
                  : loaded.state.error,
              }),
            );
          } catch (error) {
            errorRecovery.logError('loadFromPersistence', error);
            patchState(store, (current) =>
              initializeTamagotchiState(
                setErrorState(current, TAMAGOTCHI_SYSTEM_ERRORS.LOAD_FAILED),
              ),
            );
          }
        },

        selectPokemon(pokemon: PokemonModel): void {
          mutateAndSave((state) => selectPokemonState(state, pokemon));
        },

        feed(now: number): void {
          mutateAndSave((state) => feedPokemonState(state, now));
        },

        water(now: number): void {
          mutateAndSave((state) => waterPokemonState(state, now));
        },

        care(now: number): void {
          mutateAndSave((state) => careForPokemonState(state, now));
        },

        play(now: number): void {
          mutateAndSave((state) => playWithPokemonState(state, now));
        },

        startTraining(now: number, experienceReward: number): void {
          mutateAndSave((state) => startTrainingState(state, now, experienceReward));
        },

        completeTraining(now: number, experienceGain: number): void {
          mutateAndSave((state) => completeTrainingState(state, now, experienceGain));
        },

        restartTrainingTimer(now: number): void {
          mutateAndSave((state) => restartTrainingTimerState(state, now));
        },

        putToSleep(now: number): void {
          mutateAndSave((state) => putToSleepState(state, now));
        },

        wakeUp(now: number, bonusEnergy = 0): void {
          mutateAndSave((state) => wakeUpState(state, now, bonusEnergy));
        },

        interactWithPokemon(interaction: InteractionEventModel): void {
          mutateAndSave((state) => interactWithPokemonState(state, interaction));
        },

        updateStatus(statusUpdate: StatusUpdateModel): void {
          mutateAndSave((state) => updateStatusState(state, statusUpdate));
        },

        applyStatusDecay(decay: StatusDecayModel): void {
          mutateAndSave((state) => applyStatusDecayState(state, decay));
        },

        updateDailyRoutine(dailyRoutine: TamagotchiStateModel['dailyRoutine']): void {
          mutateAndSave((state) => ({ ...state, dailyRoutine }));
        },

        checkEvolution(): void {
          mutateAndSave(checkEvolutionState);
        },

        markEvolutionReadyNotified(notifiedAt: number): void {
          mutateAndSave((state) => markEvolutionReadyNotifiedState(state, notifiedAt));
        },

        startEvolution(): void {
          patchState(store, startEvolutionState);
        },

        completeEvolution(evolvedPokemon: PokemonModel): void {
          mutateAndSave((state) => completeEvolutionState(state, evolvedPokemon));
        },

        addNotification(notification: NotificationModel): void {
          mutateAndSave((state) => addNotificationState(state, notification));
        },

        setError(error: string): void {
          patchState(store, (state) => setErrorState(state, error));
        },

        clearError(): void {
          patchState(store, clearErrorState);
        },

        resetState(): void {
          persistence.clear();
          patchState(store, resetStateTransition);
          scheduleSave();
        },
      };
    },
  ),
  withHooks({
    onInit(store) {
      const destroyReference = inject(DestroyRef);
      const flushSave = (): void => {
        store.flushSave();
      };
      const flushOnHidden = (): void => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          flushSave();
        }
      };

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', flushOnHidden);
      }

      if (typeof window !== 'undefined') {
        window.addEventListener('pagehide', flushSave);
      }

      destroyReference.onDestroy(() => {
        flushSave();

        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', flushOnHidden);
        }

        if (typeof window !== 'undefined') {
          window.removeEventListener('pagehide', flushSave);
        }
      });
    },
  }),
);
