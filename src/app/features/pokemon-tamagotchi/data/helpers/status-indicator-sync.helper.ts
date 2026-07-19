import { GAME_BALANCE } from '../constants/game-balance.constants';
import type { PokemonStatusModel, StatusType } from '../models/pokemon-status.model';

export const DISPLAYED_STATUS_TYPE_LIST: StatusType[] = [
  'health',
  'hunger',
  'hydration',
  'mood',
  'energy',
  'experience',
];

export function statusValueForType(statusType: StatusType, status: PokemonStatusModel): number {
  switch (statusType) {
    case 'energy':
      return status.energy;

    case 'experience':
      return status.experience;

    case 'health':
      return status.health;

    case 'hunger':
      return status.hunger;

    case 'hydration':
      return status.hydration;

    case 'mood':
      return status.mood;
  }
}

export function maxValueForStatusType(statusType: StatusType): number {
  return statusType === 'experience'
    ? GAME_BALANCE.EVOLUTION.MIN_EXPERIENCE
    : GAME_BALANCE.THRESHOLDS.MAXIMUM;
}
