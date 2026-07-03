import { GAME_BALANCE } from '../constants/game-balance.constants';
import { MEMORY_LIMITS } from '../constants/performance-mode.constants';
import {
  type GarbageCollectLimits,
  garbageCollectTamagotchiState,
} from '../helpers/memory-management.helper';
import { applyStatusDelta } from '../helpers/status-bounds.helper';
import type { EvolutionProgressModel } from '../models/evolution.model';
import type { InteractionEventModel } from '../models/interaction.model';
import type { NotificationModel } from '../models/notification.model';
import type { PokemonModel } from '../models/pokemon.model';
import type {
  PokemonStatusModel,
  StatusDecayModel,
  StatusUpdateModel,
} from '../models/pokemon-status.model';
import type { TamagotchiStateModel } from '../models/tamagotchi-state.model';
import { initialTamagotchiState } from './tamagotchi-initial';

const INTERACTION_HISTORY_LIMIT = MEMORY_LIMITS.INTERACTION_HISTORY_MAX;
const NOTIFICATION_HISTORY_LIMIT = MEMORY_LIMITS.NOTIFICATION_HISTORY_MAX;

function withPokemon(
  state: TamagotchiStateModel,
  update: (current: TamagotchiStateModel) => TamagotchiStateModel,
): TamagotchiStateModel {
  if (!state.pokemon) {
    return state;
  }

  return update(state);
}

function whenAwake(
  state: TamagotchiStateModel,
  update: (current: TamagotchiStateModel) => TamagotchiStateModel,
): TamagotchiStateModel {
  if (state.isSleeping) {
    return state;
  }

  return update(state);
}

function updateStatusFields(
  status: PokemonStatusModel,
  changes: Partial<PokemonStatusModel>,
): PokemonStatusModel {
  return { ...status, ...changes };
}

export function computeEvolutionProgress(state: TamagotchiStateModel): EvolutionProgressModel {
  const careScore = Math.round(
    (state.status.health + state.status.hunger + state.status.mood + state.status.hydration) / 4,
  );
  const trainingScore = state.achievementList
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

function touchAction(
  state: TamagotchiStateModel,
  status: PokemonStatusModel,
  now: number,
): TamagotchiStateModel {
  return {
    ...state,
    lastActionTime: now,
    status,
  };
}

export function selectPokemonState(
  state: TamagotchiStateModel,
  pokemon: PokemonModel,
): TamagotchiStateModel {
  return {
    ...state,
    error: null,
    initialized: true,
    pokemon,
  };
}

export function clearPokemonState(state: TamagotchiStateModel): TamagotchiStateModel {
  return {
    ...initialTamagotchiState,
    initialized: state.initialized,
    lastSaveTime: state.lastSaveTime,
  };
}

export function feedPokemonState(state: TamagotchiStateModel, now: number): TamagotchiStateModel {
  return withPokemon(state, (current) =>
    whenAwake(current, (awake) => {
      const { hungerIncrease, moodIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.FEED;

      return touchAction(
        awake,
        {
          ...awake.status,
          energy: applyStatusDelta(awake.status.energy, -energyCost),
          hunger: applyStatusDelta(awake.status.hunger, hungerIncrease),
          lastFeedTime: now,
          mood: applyStatusDelta(awake.status.mood, moodIncrease),
        },
        now,
      );
    }),
  );
}

export function waterPokemonState(state: TamagotchiStateModel, now: number): TamagotchiStateModel {
  return withPokemon(state, (current) => {
    const { hydrationIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.WATER;

    return touchAction(
      current,
      {
        ...current.status,
        energy: applyStatusDelta(current.status.energy, -energyCost),
        hydration: applyStatusDelta(current.status.hydration, hydrationIncrease),
        lastHydrationTime: now,
      },
      now,
    );
  });
}

export function careForPokemonState(
  state: TamagotchiStateModel,
  now: number,
): TamagotchiStateModel {
  return withPokemon(state, (current) => {
    const { healthIncrease, moodIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.CARE;

    return touchAction(
      current,
      {
        ...current.status,
        energy: applyStatusDelta(current.status.energy, -energyCost),
        health: applyStatusDelta(current.status.health, healthIncrease),
        mood: applyStatusDelta(current.status.mood, moodIncrease),
      },
      now,
    );
  });
}

export function playWithPokemonState(
  state: TamagotchiStateModel,
  now: number,
): TamagotchiStateModel {
  return withPokemon(state, (current) =>
    whenAwake(current, (awake) => {
      const { moodIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.PLAY;

      return touchAction(
        awake,
        {
          ...awake.status,
          energy: applyStatusDelta(awake.status.energy, -energyCost),
          lastPlayTime: now,
          mood: applyStatusDelta(awake.status.mood, moodIncrease),
        },
        now,
      );
    }),
  );
}

export function startTrainingState(
  state: TamagotchiStateModel,
  now: number,
  experienceReward: number,
): TamagotchiStateModel {
  return withPokemon(state, (current) =>
    whenAwake(current, (awake) => {
      if (awake.trainingStartedAt !== null) {
        return awake;
      }

      const { energyCost } = GAME_BALANCE.ACTION_EFFECTS.TRAIN;

      return {
        ...touchAction(
          awake,
          {
            ...awake.status,
            energy: applyStatusDelta(awake.status.energy, -energyCost),
          },
          now,
        ),
        trainingExperienceReward: experienceReward,
        trainingStartedAt: now,
      };
    }),
  );
}

export function completeTrainingState(
  state: TamagotchiStateModel,
  now: number,
  experienceGain: number,
): TamagotchiStateModel {
  return withPokemon(state, (current) =>
    whenAwake(current, (awake) => {
      if (awake.trainingStartedAt === null) {
        return awake;
      }

      return {
        ...touchAction(
          awake,
          {
            ...awake.status,
            experience: awake.status.experience + experienceGain,
          },
          now,
        ),
        trainingExperienceReward: null,
        trainingStartedAt: null,
      };
    }),
  );
}

export function putToSleepState(state: TamagotchiStateModel, now: number): TamagotchiStateModel {
  return withPokemon(state, (current) => {
    if (current.isSleeping) {
      return current;
    }

    return {
      ...current,
      isSleeping: true,
      lastActionTime: now,
      status: updateStatusFields(current.status, { lastSleepTime: now }),
    };
  });
}

export function wakeUpState(state: TamagotchiStateModel, now: number): TamagotchiStateModel {
  if (!state.isSleeping) {
    return state;
  }

  return {
    ...state,
    isSleeping: false,
    lastActionTime: now,
  };
}

export function interactWithPokemonState(
  state: TamagotchiStateModel,
  interaction: InteractionEventModel,
  now: number,
): TamagotchiStateModel {
  return withPokemon(state, (current) => ({
    ...touchAction(
      current,
      {
        ...current.status,
        mood: applyStatusDelta(current.status.mood, interaction.moodIncrease),
      },
      now,
    ),
    interactionHistory: [...current.interactionHistory, interaction].slice(
      -INTERACTION_HISTORY_LIMIT,
    ),
  }));
}

export function updateStatusState(
  state: TamagotchiStateModel,
  statusUpdate: StatusUpdateModel,
): TamagotchiStateModel {
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
    status.experience = Math.max(0, Math.round(status.experience + statusUpdate.experience));
  }

  if (statusUpdate.level !== undefined) {
    status.level = Math.max(1, Math.round(status.level + statusUpdate.level));
  }

  return { ...state, status };
}

export function applyStatusDecayState(
  state: TamagotchiStateModel,
  decay: StatusDecayModel,
): TamagotchiStateModel {
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
}

export function checkEvolutionState(state: TamagotchiStateModel): TamagotchiStateModel {
  return {
    ...state,
    evolutionProgress: computeEvolutionProgress(state),
  };
}

export function startEvolutionState(state: TamagotchiStateModel): TamagotchiStateModel {
  if (!state.evolutionProgress.isReady || state.isEvolving) {
    return state;
  }

  return {
    ...state,
    isEvolving: true,
  };
}

export function completeEvolutionState(
  state: TamagotchiStateModel,
  evolvedPokemon: PokemonModel,
): TamagotchiStateModel {
  return {
    ...state,
    evolutionProgress: {
      ...state.evolutionProgress,
      currentProgress: {},
      isReady: false,
    },
    isEvolving: false,
    pokemon: evolvedPokemon,
  };
}

export function addNotificationState(
  state: TamagotchiStateModel,
  notification: NotificationModel,
): TamagotchiStateModel {
  return {
    ...state,
    notificationList: [notification, ...state.notificationList].slice(
      0,
      NOTIFICATION_HISTORY_LIMIT,
    ),
  };
}

export function dismissNotificationState(
  state: TamagotchiStateModel,
  id: string,
): TamagotchiStateModel {
  return {
    ...state,
    notificationList: state.notificationList.map((notification) => {
      if (notification.id === id) {
        return { ...notification, read: true };
      }

      return notification;
    }),
  };
}

export function initializeTamagotchiState(state: TamagotchiStateModel): TamagotchiStateModel {
  return {
    ...state,
    initialized: true,
  };
}

export function loadStateSuccessState(
  state: TamagotchiStateModel,
  loadedState: TamagotchiStateModel,
): TamagotchiStateModel {
  return {
    ...loadedState,
    initialized: true,
    lastSaveTime: loadedState.lastSaveTime ?? state.lastSaveTime,
  };
}

export function saveStateSuccessState(
  state: TamagotchiStateModel,
  savedAt: number,
): TamagotchiStateModel {
  return {
    ...state,
    lastSaveTime: savedAt,
    status: {
      ...state.status,
      lastSaveTime: savedAt,
    },
  };
}

export function resetStateTransition(): TamagotchiStateModel {
  return initialTamagotchiState;
}

export function setErrorState(state: TamagotchiStateModel, error: string): TamagotchiStateModel {
  return {
    ...state,
    error,
  };
}

export function clearErrorState(state: TamagotchiStateModel): TamagotchiStateModel {
  return {
    ...state,
    error: null,
  };
}

export function garbageCollectState(
  state: TamagotchiStateModel,
  limits: GarbageCollectLimits,
): TamagotchiStateModel {
  return garbageCollectTamagotchiState(state, limits);
}
