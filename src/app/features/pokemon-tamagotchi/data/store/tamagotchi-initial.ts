import { EVOLUTION_REQUIREMENTS } from '../constants/evolution-criteria.constants';
import { GAME_BALANCE } from '../constants/game-balance.constants';
import type { EvolutionProgress } from '../../models/evolution.model';
import type { PokemonStatus } from '../../models/pokemon-status.model';
import type { DailyRoutine, TamagotchiState } from '../../models/tamagotchi-state.model';

export function createInitialPokemonStatus(): PokemonStatus {
  return {
    health: GAME_BALANCE.THRESHOLDS.MAXIMUM,
    hunger: GAME_BALANCE.THRESHOLDS.MAXIMUM,
    mood: GAME_BALANCE.THRESHOLDS.MAXIMUM,
    energy: GAME_BALANCE.THRESHOLDS.MAXIMUM,
    hydration: GAME_BALANCE.THRESHOLDS.MAXIMUM,
    experience: 0,
    level: 1,
    lastFeedTime: null,
    lastPlayTime: null,
    lastSleepTime: null,
    lastHydrationTime: null,
    lastSaveTime: null,
  };
}

export function createInitialEvolutionProgress(): EvolutionProgress {
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
    consecutiveDays: 0,
    lastActivityDate: null,
    activityCounts: {},
    bonusEligible: false,
  };
}

export function createInitialTamagotchiState(): TamagotchiState {
  return {
    pokemon: null,
    status: createInitialPokemonStatus(),
    achievements: [],
    evolutionProgress: createInitialEvolutionProgress(),
    lastActionTime: null,
    lastDecayTime: null,
    dailyRoutine: createInitialDailyRoutine(),
    interactionHistory: [],
    isSleeping: false,
    isEvolving: false,
    trainingStartedAt: null,
    trainingExperienceReward: null,
    notifications: [],
    initialized: false,
    lastSaveTime: null,
    error: null,
  };
}

export const initialTamagotchiState: TamagotchiState = createInitialTamagotchiState();
