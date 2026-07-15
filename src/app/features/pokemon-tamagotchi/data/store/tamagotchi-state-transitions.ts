import { GAME_BALANCE } from '../constants/game-balance.constants';
import { MEMORY_LIMITS } from '../constants/performance-mode.constants';
import {
  buildEvolutionProgressForPokemon,
  buildEvolutionProgressValues,
  evaluateEvolutionRequirements,
} from '../helpers/evolution-checker.helper';
import { recordRoutineActivity } from '../helpers/routine.helper';
import { applyStatusUpdate, computeLevelFromExperience } from '../helpers/status-calculator.helper';
import { applyDecayToStatus } from '../helpers/status-decay.helper';
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
  const currentProgress = buildEvolutionProgressValues(
    state.status,
    state.achievementList,
    state.dailyRoutine.consecutiveDays,
  );
  const { isReady } = evaluateEvolutionRequirements(
    state.evolutionProgress.requirements,
    currentProgress,
  );

  return {
    ...state.evolutionProgress,
    currentProgress,
    isReady,
    readyNotifiedAt: state.evolutionProgress.readyNotifiedAt ?? null,
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
    selectionOriginId: pokemon.id,
    evolutionProgress: buildEvolutionProgressForPokemon(pokemon),
  };
}

export function healSelectionOriginIdState(
  state: TamagotchiStateModel,
  selectionOriginId: string,
): TamagotchiStateModel {
  if (state.selectionOriginId === selectionOriginId) {
    return state;
  }

  return {
    ...state,
    selectionOriginId,
  };
}

export function feedPokemonState(state: TamagotchiStateModel, now: number): TamagotchiStateModel {
  return withPokemon(state, (current) =>
    whenAwake(current, (awake) => {
      const { hungerIncrease, moodIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.FEED;

      return {
        ...touchAction(
          awake,
          {
            ...awake.status,
            energy: applyStatusDelta(awake.status.energy, -energyCost),
            hunger: applyStatusDelta(awake.status.hunger, hungerIncrease),
            lastFeedTime: now,
            mood: applyStatusDelta(awake.status.mood, moodIncrease),
          },
          now,
        ),
        dailyRoutine: recordRoutineActivity(awake.dailyRoutine, 'feed', now),
      };
    }),
  );
}

export function waterPokemonState(state: TamagotchiStateModel, now: number): TamagotchiStateModel {
  return withPokemon(state, (current) => {
    const { hydrationIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.WATER;

    return {
      ...touchAction(
        current,
        {
          ...current.status,
          energy: applyStatusDelta(current.status.energy, -energyCost),
          hydration: applyStatusDelta(current.status.hydration, hydrationIncrease),
          lastHydrationTime: now,
        },
        now,
      ),
      dailyRoutine: recordRoutineActivity(current.dailyRoutine, 'water', now),
    };
  });
}

export function careForPokemonState(
  state: TamagotchiStateModel,
  now: number,
): TamagotchiStateModel {
  return withPokemon(state, (current) => {
    const { healthIncrease, moodIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.CARE;

    return {
      ...touchAction(
        current,
        {
          ...current.status,
          energy: applyStatusDelta(current.status.energy, -energyCost),
          health: applyStatusDelta(current.status.health, healthIncrease),
          lastCareTime: now,
          mood: applyStatusDelta(current.status.mood, moodIncrease),
        },
        now,
      ),
      dailyRoutine: recordRoutineActivity(current.dailyRoutine, 'care', now),
    };
  });
}

export function playWithPokemonState(
  state: TamagotchiStateModel,
  now: number,
): TamagotchiStateModel {
  return withPokemon(state, (current) =>
    whenAwake(current, (awake) => {
      const { moodIncrease, energyCost } = GAME_BALANCE.ACTION_EFFECTS.PLAY;

      return {
        ...touchAction(
          awake,
          {
            ...awake.status,
            energy: applyStatusDelta(awake.status.energy, -energyCost),
            lastPlayTime: now,
            mood: applyStatusDelta(awake.status.mood, moodIncrease),
          },
          now,
        ),
        dailyRoutine: recordRoutineActivity(awake.dailyRoutine, 'play', now),
      };
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

      const experience = awake.status.experience + experienceGain;

      return {
        ...touchAction(
          awake,
          {
            ...awake.status,
            experience,
            lastTrainTime: now,
            level: computeLevelFromExperience(experience),
          },
          now,
        ),
        dailyRoutine: recordRoutineActivity(awake.dailyRoutine, 'train', now),
        trainingExperienceReward: null,
        trainingStartedAt: null,
      };
    }),
  );
}

export function restartTrainingTimerState(
  state: TamagotchiStateModel,
  now: number,
): TamagotchiStateModel {
  return withPokemon(state, (current) =>
    whenAwake(current, (awake) => {
      if (awake.trainingStartedAt === null) {
        return awake;
      }

      return {
        ...awake,
        trainingStartedAt: now,
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

export function wakeUpState(
  state: TamagotchiStateModel,
  now: number,
  bonusEnergy = 0,
): TamagotchiStateModel {
  if (!state.isSleeping) {
    return state;
  }

  return {
    ...state,
    isSleeping: false,
    lastActionTime: now,
    status: updateStatusFields(state.status, {
      energy: applyStatusDelta(state.status.energy, bonusEnergy),
    }),
  };
}

export function interactWithPokemonState(
  state: TamagotchiStateModel,
  interaction: InteractionEventModel,
): TamagotchiStateModel {
  return withPokemon(state, (current) => ({
    ...current,
    status: updateStatusFields(current.status, {
      mood: applyStatusDelta(current.status.mood, interaction.moodIncrease),
    }),
    interactionHistory: [...current.interactionHistory, interaction].slice(
      -INTERACTION_HISTORY_LIMIT,
    ),
  }));
}

export function updateStatusState(
  state: TamagotchiStateModel,
  statusUpdate: StatusUpdateModel,
): TamagotchiStateModel {
  return {
    ...state,
    status: applyStatusUpdate(state.status, statusUpdate),
  };
}

export function applyStatusDecayState(
  state: TamagotchiStateModel,
  decay: StatusDecayModel,
): TamagotchiStateModel {
  return {
    ...state,
    lastDecayTime: decay.timestamp,
    status: applyDecayToStatus(state.status, decay),
  };
}

export function checkEvolutionState(state: TamagotchiStateModel): TamagotchiStateModel {
  return {
    ...state,
    evolutionProgress: computeEvolutionProgress(state),
  };
}

export function syncEvolutionProgressWithPokemon(
  state: TamagotchiStateModel,
): TamagotchiStateModel {
  if (!state.pokemon) {
    return state;
  }

  const syncedState: TamagotchiStateModel = {
    ...state,
    evolutionProgress: {
      ...buildEvolutionProgressForPokemon(state.pokemon),
      currentProgress: state.evolutionProgress.currentProgress,
      readyNotifiedAt: state.evolutionProgress.readyNotifiedAt ?? null,
    },
  };

  return {
    ...syncedState,
    evolutionProgress: computeEvolutionProgress(syncedState),
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

export function markEvolutionReadyNotifiedState(
  state: TamagotchiStateModel,
  notifiedAt: number,
): TamagotchiStateModel {
  if (!state.evolutionProgress.isReady) {
    return state;
  }

  return {
    ...state,
    evolutionProgress: {
      ...state.evolutionProgress,
      readyNotifiedAt: notifiedAt,
    },
  };
}

export function clearEvolutionReadyNotifiedState(
  state: TamagotchiStateModel,
): TamagotchiStateModel {
  if (state.evolutionProgress.readyNotifiedAt === null) {
    return state;
  }

  return {
    ...state,
    evolutionProgress: {
      ...state.evolutionProgress,
      readyNotifiedAt: null,
    },
  };
}

export function completeEvolutionState(
  state: TamagotchiStateModel,
  evolvedPokemon: PokemonModel,
): TamagotchiStateModel {
  return {
    ...state,
    evolutionProgress: buildEvolutionProgressForPokemon(evolvedPokemon),
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
