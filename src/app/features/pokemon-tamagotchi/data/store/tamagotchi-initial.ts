import { EVOLUTION_REQUIREMENTS } from '../constants/evolution-criteria.constants';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import type { EvolutionProgressModel } from '../models/evolution.model';
import type { PokemonStatusModel } from '../models/pokemon-status.model';
import type { DailyRoutine, TamagotchiStateModel } from '../models/tamagotchi-state.model';

export function createInitialPokemonStatus(): PokemonStatusModel {
  return {
    health: GAME_BALANCE.THRESHOLDS.MAXIMUM,
    hunger: GAME_BALANCE.THRESHOLDS.MAXIMUM,
    mood: GAME_BALANCE.THRESHOLDS.MAXIMUM,
    energy: GAME_BALANCE.THRESHOLDS.MAXIMUM,
    hydration: GAME_BALANCE.THRESHOLDS.MAXIMUM,
    experience: 0,
    level: 1,
    lastCareTime: null,
    lastFeedTime: null,
    lastTrainTime: null,
    lastPlayTime: null,
    lastSleepTime: null,
    lastHydrationTime: null,
    lastSaveTime: null,
  };
}

export function createInitialEvolutionProgress(): EvolutionProgressModel {
  const currentProgress: Record<string, number> = {};

  for (const requirement of EVOLUTION_REQUIREMENTS) {
    currentProgress[requirement.type] = 0;
  }

  return {
    requirements: [...EVOLUTION_REQUIREMENTS],
    currentProgress,
    isReady: false,
  };
}

export function createInitialDailyRoutine(): DailyRoutine {
  return {
    activityCounts: {},
    bonusAppliedDate: null,
    bonusEligible: false,
    consecutiveDays: 0,
    lastActivityDate: null,
  };
}

export function createInitialTamagotchiState(): TamagotchiStateModel {
  return {
    pokemon: null,
    status: createInitialPokemonStatus(),
    achievementList: [],
    evolutionProgress: createInitialEvolutionProgress(),
    lastActionTime: null,
    lastDecayTime: null,
    dailyRoutine: createInitialDailyRoutine(),
    interactionHistory: [],
    isSleeping: false,
    isEvolving: false,
    trainingStartedAt: null,
    trainingExperienceReward: null,
    notificationList: [],
    initialized: false,
    lastSaveTime: null,
    error: null,
  };
}

export const initialTamagotchiState: TamagotchiStateModel = createInitialTamagotchiState();
