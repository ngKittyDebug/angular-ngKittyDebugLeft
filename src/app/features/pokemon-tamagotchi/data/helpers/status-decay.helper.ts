import { GAME_BALANCE } from '../constants/game-balance.constants';
import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import type { StatusAlertType } from '../../models/notification.model';
import type { PokemonStatus, StatusDecay } from '../../models/pokemon-status.model';
import { applyStatusDelta } from './status-bounds.helper';

const MS_PER_HOUR = 60 * 60 * 1000;

export function decayAmountForElapsed(ratePerHour: number, elapsedMs: number): number {
  if (elapsedMs <= 0) {
    return 0;
  }

  return (elapsedMs / MS_PER_HOUR) * ratePerHour;
}

export function calculateDecay(
  elapsedMs: number,
  currentStatus: PokemonStatus,
  isSleeping: boolean,
  timestamp: number = Date.now(),
): StatusDecay {
  const hunger = decayAmountForElapsed(GAME_BALANCE.STATUS_DECAY.HUNGER, elapsedMs);
  const mood = decayAmountForElapsed(GAME_BALANCE.STATUS_DECAY.MOOD, elapsedMs);
  const hydration = decayAmountForElapsed(GAME_BALANCE.STATUS_DECAY.HYDRATION, elapsedMs);

  const energy = isSleeping
    ? -decayAmountForElapsed(GAME_BALANCE.ACTION_EFFECTS.SLEEP.energyRestore, elapsedMs)
    : decayAmountForElapsed(GAME_BALANCE.STATUS_DECAY.ENERGY, elapsedMs);

  return {
    energy,
    hunger,
    hydration,
    mood,
    timestamp,
  };
}

export function applyDecayToStatus(status: PokemonStatus, decay: StatusDecay): PokemonStatus {
  return {
    ...status,
    energy: applyStatusDelta(status.energy, -decay.energy),
    hunger: applyStatusDelta(status.hunger, -decay.hunger),
    hydration: applyStatusDelta(status.hydration, -decay.hydration),
    mood: applyStatusDelta(status.mood, -decay.mood),
  };
}

interface ThresholdPair {
  critical: number;
  warning: number;
}

function crossedDownward(before: number, after: number, threshold: number): boolean {
  return before > threshold && after <= threshold;
}

function detectStatAlerts(
  before: number,
  after: number,
  thresholds: ThresholdPair,
  lowType: StatusAlertType,
  criticalType: StatusAlertType,
): StatusAlertType[] {
  const alerts: StatusAlertType[] = [];

  if (crossedDownward(before, after, thresholds.critical)) {
    alerts.push(criticalType);
  } else if (crossedDownward(before, after, thresholds.warning)) {
    alerts.push(lowType);
  }

  return alerts;
}

export function detectStatusAlerts(before: PokemonStatus, after: PokemonStatus): StatusAlertType[] {
  return [
    ...detectStatAlerts(
      before.hunger,
      after.hunger,
      {
        critical: STATUS_THRESHOLDS.hungerCritical,
        warning: STATUS_THRESHOLDS.hungerWarning,
      },
      'hungerLow',
      'hungerCritical',
    ),
    ...detectStatAlerts(
      before.mood,
      after.mood,
      {
        critical: STATUS_THRESHOLDS.moodCritical,
        warning: STATUS_THRESHOLDS.moodWarning,
      },
      'moodLow',
      'moodCritical',
    ),
    ...detectStatAlerts(
      before.energy,
      after.energy,
      {
        critical: STATUS_THRESHOLDS.energyCritical,
        warning: STATUS_THRESHOLDS.energyWarning,
      },
      'energyLow',
      'energyCritical',
    ),
    ...detectStatAlerts(
      before.hydration,
      after.hydration,
      {
        critical: STATUS_THRESHOLDS.hydrationCritical,
        warning: STATUS_THRESHOLDS.hydrationWarning,
      },
      'hydrationLow',
      'hydrationCritical',
    ),
  ];
}

export function getElapsedDecayMs(
  lastDecayTime: number | null,
  lastActionTime: number | null,
  now: number,
): number {
  const anchor = lastDecayTime ?? lastActionTime ?? now;

  return Math.max(0, now - anchor);
}
