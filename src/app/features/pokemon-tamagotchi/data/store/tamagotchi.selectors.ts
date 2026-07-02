import { createFeatureSelector, createSelector } from '@ngrx/store';
import { calculateBondLevel } from '../helpers/gesture.helper';
import { sortNotificationsByPriority } from '../helpers/notification-factory.helper';
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

export const selectIsTraining = createSelector(
  selectTamagotchiState,
  (state) => state.trainingStartedAt !== null,
);

export const selectTrainingStartedAt = createSelector(
  selectTamagotchiState,
  (state) => state.trainingStartedAt,
);

export const selectNotifications = createSelector(
  selectTamagotchiState,
  (state) => state.notifications,
);

export const selectUnreadNotifications = createSelector(selectNotifications, (notifications) =>
  sortNotificationsByPriority(notifications.filter((notification) => !notification.read)),
);

export const selectNotificationHistory = createSelector(selectNotifications, (notifications) =>
  [...notifications].sort((left, right) => right.timestamp - left.timestamp),
);

export const selectInteractionHistory = createSelector(
  selectTamagotchiState,
  (state) => state.interactionHistory,
);

export const selectBondLevel = createSelector(selectInteractionHistory, (history) =>
  calculateBondLevel(history),
);

export const selectDailyRoutine = createSelector(
  selectTamagotchiState,
  (state) => state.dailyRoutine,
);

export const selectIsInitialized = createSelector(
  selectTamagotchiState,
  (state) => state?.initialized ?? false,
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
