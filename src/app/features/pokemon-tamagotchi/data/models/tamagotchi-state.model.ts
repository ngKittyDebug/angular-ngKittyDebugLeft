import type { AchievementModel } from './achievement.model';
import type { EvolutionProgressModel } from './evolution.model';
import type { InteractionEventModel } from './interaction.model';
import type { NotificationModel } from './notification.model';
import type { PokemonModel } from './pokemon.model';
import type { PokemonStatusModel } from './pokemon-status.model';

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

export interface TamagotchiStateModel {
  pokemon: PokemonModel | null;
  status: PokemonStatusModel;
  achievementList: AchievementModel[];
  evolutionProgress: EvolutionProgressModel;
  lastActionTime: number | null;
  lastDecayTime: number | null;
  dailyRoutine: DailyRoutine;
  interactionHistory: InteractionEventModel[];
  isSleeping: boolean;
  isEvolving: boolean;
  trainingStartedAt: number | null;
  trainingExperienceReward: number | null;
  notificationList: NotificationModel[];
  initialized: boolean;
  lastSaveTime: number | null;
  error: string | null;
}
