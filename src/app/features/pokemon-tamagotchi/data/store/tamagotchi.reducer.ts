import { createReducer, on } from '@ngrx/store';
import { applyStatusDelta } from '../helpers/status-bounds.helper';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import type { EvolutionProgress } from '../../models/evolution.model';
import type { PokemonStatus } from '../../models/pokemon-status.model';
import type { TamagotchiState } from '../../models/tamagotchi-state.model';
import * as TamagotchiActions from './tamagotchi.actions';
import { initialTamagotchiState } from './tamagotchi.state';

const INTERACTION_HISTORY_LIMIT = 50;
const NOTIFICATION_HISTORY_LIMIT = 20;

function withPokemon(
  state: TamagotchiState,
  update: (current: TamagotchiState) => TamagotchiState,
): TamagotchiState {
  if (!state.pokemon) {
    return state;
  }

  return update(state);
}

function whenAwake(
  state: TamagotchiState,
  update: (current: TamagotchiState) => TamagotchiState,
): TamagotchiState {
  if (state.isSleeping) {
    return state;
  }

  return update(state);
}

function updateStatusFields(status: PokemonStatus, changes: Partial<PokemonStatus>): PokemonStatus {
  return { ...status, ...changes };
}

function computeEvolutionProgress(state: TamagotchiState): EvolutionProgress {
  const careScore = Math.round(
    (state.status.health + state.status.hunger + state.status.mood + state.status.hydration) / 4,
  );
  const trainingScore = state.achievements
    .filter((achievement) => achievement.category === 'training' && achievement.unlocked)
    .reduce((total, achievement) => total + achievement.reward.experience, 0);

  const currentProgress: Record<string, number> = {
    achievement: trainingScore,
    care: careScore,
    experience: state.status.experience,
    level: state.status.level,
    time: state.dailyRoutine.consecutiveDays,
  };

  const isReady = state.evolutionProgress.requirements.every(
    (requirement) => (currentProgress[requirement.type] ?? 0) >= requirement.value,
  );

  return {
    ...state.evolutionProgress,
    currentProgress,
    isReady,
  };
}

function touchAction(state: TamagotchiState, status: PokemonStatus): TamagotchiState {
  const now = Date.now();

  return {
    ...state,
    lastActionTime: now,
    status,
  };
}

export const tamagotchiReducer = createReducer(
  initialTamagotchiState,

  on(TamagotchiActions.selectPokemon, (state, { pokemon }) => ({
    ...state,
    error: null,
    initialized: true,
    pokemon,
  })),

  on(TamagotchiActions.clearPokemon, (state) => ({
    ...initialTamagotchiState,
    initialized: state.initialized,
    lastSaveTime: state.lastSaveTime,
  })),

  on(TamagotchiActions.feedPokemon, (state) =>
    withPokemon(state, (current) =>
      whenAwake(current, (awake) => {
        const { hungerIncrease, moodIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.FEED;
        const now = Date.now();

        return touchAction(awake, {
          ...awake.status,
          energy: applyStatusDelta(awake.status.energy, -energyCost),
          hunger: applyStatusDelta(awake.status.hunger, hungerIncrease),
          lastFeedTime: now,
          mood: applyStatusDelta(awake.status.mood, moodIncrease),
        });
      }),
    ),
  ),

  on(TamagotchiActions.waterPokemon, (state) =>
    withPokemon(state, (current) => {
      const { hydrationIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.WATER;
      const now = Date.now();

      return touchAction(current, {
        ...current.status,
        energy: applyStatusDelta(current.status.energy, -energyCost),
        hydration: applyStatusDelta(current.status.hydration, hydrationIncrease),
        lastHydrationTime: now,
      });
    }),
  ),

  on(TamagotchiActions.careForPokemon, (state) =>
    withPokemon(state, (current) => {
      const { healthIncrease, moodIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.CARE;

      return touchAction(current, {
        ...current.status,
        energy: applyStatusDelta(current.status.energy, -energyCost),
        health: applyStatusDelta(current.status.health, healthIncrease),
        mood: applyStatusDelta(current.status.mood, moodIncrease),
      });
    }),
  ),

  on(TamagotchiActions.playWithPokemon, (state) =>
    withPokemon(state, (current) =>
      whenAwake(current, (awake) => {
        const { moodIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.PLAY;
        const now = Date.now();

        return touchAction(awake, {
          ...awake.status,
          energy: applyStatusDelta(awake.status.energy, -energyCost),
          lastPlayTime: now,
          mood: applyStatusDelta(awake.status.mood, moodIncrease),
        });
      }),
    ),
  ),

  on(TamagotchiActions.trainPokemon, (state, { gameResult }) =>
    withPokemon(state, (current) =>
      whenAwake(current, (awake) => {
        const { energyCost } = GAME_BALANCE.ACTION_EFFECTS.TRAIN;

        return {
          ...touchAction(awake, {
            ...awake.status,
            energy: applyStatusDelta(awake.status.energy, -energyCost),
            experience: awake.status.experience + gameResult.experienceEarned,
          }),
          activeMiniGame: null,
        };
      }),
    ),
  ),

  on(TamagotchiActions.putToSleep, (state) =>
    withPokemon(state, (current) => {
      if (current.isSleeping) {
        return current;
      }

      const now = Date.now();

      return {
        ...current,
        isSleeping: true,
        lastActionTime: now,
        status: updateStatusFields(current.status, { lastSleepTime: now }),
      };
    }),
  ),

  on(TamagotchiActions.wakeUp, (state) => {
    if (!state.isSleeping) {
      return state;
    }

    return {
      ...state,
      isSleeping: false,
      lastActionTime: Date.now(),
    };
  }),

  on(TamagotchiActions.interactWithPokemon, (state, { interaction }) =>
    withPokemon(state, (current) => ({
      ...touchAction(current, {
        ...current.status,
        mood: applyStatusDelta(current.status.mood, interaction.moodIncrease),
      }),
      interactionHistory: [...current.interactionHistory, interaction].slice(
        -INTERACTION_HISTORY_LIMIT,
      ),
    })),
  ),

  on(TamagotchiActions.updateStatus, (state, { statusUpdate }) => {
    const status = { ...state.status };

    if (statusUpdate.health !== undefined) {
      status.health = applyStatusDelta(status.health, statusUpdate.health);
    }

    if (statusUpdate.hunger !== undefined) {
      status.hunger = applyStatusDelta(status.hunger, statusUpdate.hunger);
    }

    if (statusUpdate.mood !== undefined) {
      status.mood = applyStatusDelta(status.mood, statusUpdate.mood);
    }

    if (statusUpdate.energy !== undefined) {
      status.energy = applyStatusDelta(status.energy, statusUpdate.energy);
    }

    if (statusUpdate.hydration !== undefined) {
      status.hydration = applyStatusDelta(status.hydration, statusUpdate.hydration);
    }

    if (statusUpdate.experience !== undefined) {
      status.experience = Math.max(0, status.experience + statusUpdate.experience);
    }

    if (statusUpdate.level !== undefined) {
      status.level = Math.max(1, status.level + statusUpdate.level);
    }

    return { ...state, status };
  }),

  on(TamagotchiActions.applyStatusDecay, (state, { decay }) => {
    const status = {
      ...state.status,
      energy: applyStatusDelta(state.status.energy, -decay.energy),
      hunger: applyStatusDelta(state.status.hunger, -decay.hunger),
      hydration: applyStatusDelta(state.status.hydration, -decay.hydration),
      mood: applyStatusDelta(state.status.mood, -decay.mood),
    };

    return {
      ...state,
      lastDecayTime: decay.timestamp,
      status,
    };
  }),

  on(TamagotchiActions.openMiniGame, (state, { gameType }) => ({
    ...state,
    activeMiniGame: gameType,
  })),

  on(TamagotchiActions.closeMiniGame, (state) => ({
    ...state,
    activeMiniGame: null,
  })),

  on(TamagotchiActions.checkEvolution, (state) => ({
    ...state,
    evolutionProgress: computeEvolutionProgress(state),
  })),

  on(TamagotchiActions.startEvolution, (state) => {
    if (!state.evolutionProgress.isReady || state.isEvolving) {
      return state;
    }

    return {
      ...state,
      isEvolving: true,
    };
  }),

  on(TamagotchiActions.completeEvolution, (state, { evolvedPokemon }) => ({
    ...state,
    evolutionProgress: {
      ...state.evolutionProgress,
      currentProgress: {},
      isReady: false,
    },
    isEvolving: false,
    pokemon: evolvedPokemon,
  })),

  on(TamagotchiActions.addNotification, (state, { notification }) => ({
    ...state,
    notifications: [notification, ...state.notifications].slice(0, NOTIFICATION_HISTORY_LIMIT),
  })),

  on(TamagotchiActions.dismissNotification, (state, { id }) => ({
    ...state,
    notifications: state.notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification,
    ),
  })),

  on(TamagotchiActions.markNotificationRead, (state, { id }) => ({
    ...state,
    notifications: state.notifications.map((notification) =>
      notification.id === id ? { ...notification, read: true } : notification,
    ),
  })),

  on(TamagotchiActions.initializeTamagotchi, (state) => ({
    ...state,
    initialized: true,
  })),

  on(TamagotchiActions.loadStateSuccess, (state, { state: loadedState }) => ({
    ...loadedState,
    initialized: true,
    lastSaveTime: loadedState.lastSaveTime ?? state.lastSaveTime,
  })),

  on(TamagotchiActions.saveStateSuccess, (state, { savedAt }) => ({
    ...state,
    lastSaveTime: savedAt,
    status: {
      ...state.status,
      lastSaveTime: savedAt,
    },
  })),

  on(TamagotchiActions.resetState, () => initialTamagotchiState),

  on(TamagotchiActions.setError, (state, { error }) => ({
    ...state,
    error,
  })),

  on(TamagotchiActions.clearError, (state) => ({
    ...state,
    error: null,
  })),
);
