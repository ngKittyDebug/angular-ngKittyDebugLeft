import type { Achievement } from './achievement.model';
import type { EvolutionProgress } from './evolution.model';
import type { InteractionEvent } from './interaction.model';
import type { MiniGameType } from './mini-game.model';
import type { Notification } from './notification.model';
import type { Pokemon } from './pokemon.model';
import type { PokemonStatus } from './pokemon-status.model';
import type { TamagotchiCustomization } from './customization.model';

export type ActionType = 'feed' | 'water' | 'care' | 'play' | 'train' | 'sleep';

export interface ActionCooldowns {
  feed: number | null;
  water: number | null;
  care: number | null;
  play: number | null;
  train: number | null;
  sleep: number | null;
}

export interface DailyRoutine {
  consecutiveDays: number;
  lastActivityDate: string | null;
  activityCounts: Record<string, number>;
  bonusEligible: boolean;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  cooldownRemaining?: number;
}

export interface TamagotchiState {
  pokemon: Pokemon | null;
  status: PokemonStatus;
  achievements: Achievement[];
  evolutionProgress: EvolutionProgress;
  lastActionTime: number | null;
  lastDecayTime: number | null;
  dailyRoutine: DailyRoutine;
  interactionHistory: InteractionEvent[];
  customization: TamagotchiCustomization;
  isSleeping: boolean;
  isEvolving: boolean;
  activeMiniGame: MiniGameType | null;
  notifications: Notification[];
  initialized: boolean;
  lastSaveTime: number | null;
  error: string | null;
}
