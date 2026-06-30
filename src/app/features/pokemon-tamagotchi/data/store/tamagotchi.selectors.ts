import { createFeatureSelector, createSelector } from '@ngrx/store';
import type { TamagotchiState } from '../../models/tamagotchi-state.model';
import { TAMAGOTCHI_FEATURE_KEY } from './tamagotchi.state';

export const selectTamagotchiState = createFeatureSelector<TamagotchiState>(TAMAGOTCHI_FEATURE_KEY);

export const selectPokemon = createSelector(selectTamagotchiState, (state) => state.pokemon);

export const selectStatus = createSelector(selectTamagotchiState, (state) => state.status);

export const selectAchievements = createSelector(
  selectTamagotchiState,
  (state) => state.achievements,
);

export const selectEvolutionProgress = createSelector(
  selectTamagotchiState,
  (state) => state.evolutionProgress,
);

export const selectIsSleeping = createSelector(selectTamagotchiState, (state) => state.isSleeping);

export const selectIsEvolving = createSelector(selectTamagotchiState, (state) => state.isEvolving);

export const selectActiveMiniGame = createSelector(
  selectTamagotchiState,
  (state) => state.activeMiniGame,
);

export const selectNotifications = createSelector(
  selectTamagotchiState,
  (state) => state.notifications,
);

export const selectInteractionHistory = createSelector(
  selectTamagotchiState,
  (state) => state.interactionHistory,
);

export const selectDailyRoutine = createSelector(
  selectTamagotchiState,
  (state) => state.dailyRoutine,
);

export const selectIsInitialized = createSelector(
  selectTamagotchiState,
  (state) => state.initialized,
);

export const selectLastSaveTime = createSelector(
  selectTamagotchiState,
  (state) => state.lastSaveTime,
);

export const selectTamagotchiError = createSelector(selectTamagotchiState, (state) => state.error);

export const selectHasPokemon = createSelector(selectPokemon, (pokemon) => pokemon !== null);

export const selectCanEvolve = createSelector(
  selectEvolutionProgress,
  selectIsEvolving,
  (progress, isEvolving) => progress.isReady && !isEvolving,
);
