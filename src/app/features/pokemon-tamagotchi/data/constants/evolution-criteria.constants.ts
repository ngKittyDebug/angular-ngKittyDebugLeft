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
];

export const EVOLUTION_REQUIREMENTS_STAGE_2: EvolutionRequirementModel[] = [
  {
    type: 'level',
    value: GAME_BALANCE.EVOLUTION.MIN_LEVEL_STAGE_2,
    description: 'Reach minimum level for second evolution',
  },
  {
    type: 'experience',
    value: GAME_BALANCE.EVOLUTION.MIN_EXPERIENCE_STAGE_2,
    description: 'Accumulate enough experience for second evolution',
  },
  {
    type: 'care',
    value: GAME_BALANCE.EVOLUTION.MIN_CARE_SCORE_STAGE_2,
    description: 'Maintain high care score for second evolution',
  },
];

const EVOLUTION_REQUIREMENTS_BY_FROM_STAGE: Record<number, EvolutionRequirementModel[]> = {
  1: EVOLUTION_REQUIREMENTS,
  2: EVOLUTION_REQUIREMENTS_STAGE_2,
};

export function getEvolutionRequirementsForFromStage(
  fromStage: number,
): EvolutionRequirementModel[] {
  return EVOLUTION_REQUIREMENTS_BY_FROM_STAGE[fromStage] ?? EVOLUTION_REQUIREMENTS_STAGE_2;
}
