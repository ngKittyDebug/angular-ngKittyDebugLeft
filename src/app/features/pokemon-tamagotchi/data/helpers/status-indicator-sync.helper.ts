import { GAME_BALANCE } from '../constants/game-balance.constants';
import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import type { PokemonStatus, StatusType } from '../../models/pokemon-status.model';
import {
  getStatusIndicatorLevel,
  getThresholdsForStatusType,
  resolveStatusIndicatorColor,
  type StatusIndicatorLevel,
} from './status-indicator.helper';

export interface StatusIndicatorSnapshot {
  alertLevel: StatusIndicatorLevel | null;
  color: string;
  percentage: number;
  statusType: StatusType;
  value: number;
}

export const DISPLAYED_STATUS_TYPES: StatusType[] = [
  'health',
  'hunger',
  'hydration',
  'mood',
  'energy',
  'experience',
];

export function statusValueForType(statusType: StatusType, status: PokemonStatus): number {
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

export function computeIndicatorPercentage(value: number, max: number): number {
  if (max <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, (value / max) * 100));
}

export function projectStatusIndicator(
  statusType: StatusType,
  status: PokemonStatus,
): StatusIndicatorSnapshot {
  const value = statusValueForType(statusType, status);
  const max = maxValueForStatusType(statusType);
  const bounds = getThresholdsForStatusType(statusType, STATUS_THRESHOLDS);

  return {
    alertLevel: bounds ? getStatusIndicatorLevel(value, bounds.warning, bounds.critical) : null,
    color: resolveStatusIndicatorColor(statusType, value, STATUS_THRESHOLDS),
    percentage: computeIndicatorPercentage(value, max),
    statusType,
    value,
  };
}

export function projectAllStatusIndicators(status: PokemonStatus): StatusIndicatorSnapshot[] {
  return DISPLAYED_STATUS_TYPES.map((statusType) => projectStatusIndicator(statusType, status));
}

export function indicatorsMatchStatus(
  status: PokemonStatus,
  indicators: StatusIndicatorSnapshot[],
): boolean {
  return indicators.every(
    (indicator) => indicator.value === statusValueForType(indicator.statusType, status),
  );
}
