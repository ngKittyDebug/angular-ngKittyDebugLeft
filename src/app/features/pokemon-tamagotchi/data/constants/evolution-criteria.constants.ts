import type { EvolutionRequirementModel } from '../models/evolution.model';
import { GAME_BALANCE } from './game-balance.constants';

export const EVOLUTION_CRITERIA = {
  ...GAME_BALANCE.EVOLUTION,
} as const;

export const EVOLUTION_ANIMATION_DURATION_MS = 3000;

export const EVOLUTION_REQUIREMENTS: EvolutionRequirementModel[] = [
  {
    type: 'level',
    value: GAME_BALANCE.EVOLUTION.MIN_LEVEL,
    description: 'Reach minimum level',
  },
  {
    type: 'experience',
    value: GAME_BALANCE.EVOLUTION.MIN_EXPERIENCE,
    description: 'Accumulate enough experience',
  },
  {
    type: 'care',
    value: GAME_BALANCE.EVOLUTION.MIN_CARE_SCORE,
    description: 'Maintain high care score',
  },
  {
    type: 'achievement',
    value: GAME_BALANCE.EVOLUTION.MIN_TRAINING_SCORE,
    description: 'Complete training milestones',
  },
];
