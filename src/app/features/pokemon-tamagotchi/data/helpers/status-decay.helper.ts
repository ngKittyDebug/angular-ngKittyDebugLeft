import { GAME_BALANCE } from '../constants/game-balance.constants';
import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import { TIMER_CONFIG } from '../constants/timer.constants';
import type { StatusAlertType } from '../models/notification.model';
import type { PokemonStatusModel, StatusDecayModel } from '../models/pokemon-status.model';
import { applyStatusDelta } from './status-bounds.helper';
import { getStatusIndicatorLevel } from './status-indicator.helper';

const MS_PER_HOUR = 60 * 60 * 1000;

export function decayAmountForElapsed(ratePerHour: number, elapsedMs: number): number {
  if (elapsedMs <= 0) {
    return 0;
  }

  return (elapsedMs / MS_PER_HOUR) * ratePerHour;
}

export function calculateDecay(
  elapsedMs: number,
  currentStatus: PokemonStatusModel,
  isSleeping: boolean,
  timestamp: number = Date.now(),
): StatusDecayModel {
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

export function applyDecayToStatus(
  status: PokemonStatusModel,
  decay: StatusDecayModel,
): PokemonStatusModel {
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

interface StatAlertConfig {
  criticalType: StatusAlertType;
  getValue: (status: PokemonStatusModel) => number;
  lowType: StatusAlertType;
  thresholds: ThresholdPair;
}

const STAT_ALERT_CONFIG: StatAlertConfig[] = [
  {
    criticalType: 'hungerCritical',
    getValue: (status) => status.hunger,
    lowType: 'hungerLow',
    thresholds: {
      critical: STATUS_THRESHOLDS.hungerCritical,
      warning: STATUS_THRESHOLDS.hungerWarning,
    },
  },
  {
    criticalType: 'moodCritical',
    getValue: (status) => status.mood,
    lowType: 'moodLow',
    thresholds: {
      critical: STATUS_THRESHOLDS.moodCritical,
      warning: STATUS_THRESHOLDS.moodWarning,
    },
  },
  {
    criticalType: 'energyCritical',
    getValue: (status) => status.energy,
    lowType: 'energyLow',
    thresholds: {
      critical: STATUS_THRESHOLDS.energyCritical,
      warning: STATUS_THRESHOLDS.energyWarning,
    },
  },
  {
    criticalType: 'hydrationCritical',
    getValue: (status) => status.hydration,
    lowType: 'hydrationLow',
    thresholds: {
      critical: STATUS_THRESHOLDS.hydrationCritical,
      warning: STATUS_THRESHOLDS.hydrationWarning,
    },
  },
];

function decreasedByWholeUnit(before: number, after: number): boolean {
  return Math.floor(before) - Math.floor(after) === 1;
}

function detectStatAlerts(
  before: number,
  after: number,
  thresholds: ThresholdPair,
  lowType: StatusAlertType,
  criticalType: StatusAlertType,
): StatusAlertType[] {
  if (!decreasedByWholeUnit(before, after)) {
    return [];
  }

  const afterLevel = getStatusIndicatorLevel(after, thresholds.warning, thresholds.critical);

  if (afterLevel === 'critical') {
    return [criticalType];
  }

  if (afterLevel === 'warning') {
    return [lowType];
  }

  return [];
}

export function detectStatusAlerts(
  before: PokemonStatusModel,
  after: PokemonStatusModel,
): StatusAlertType[] {
  return STAT_ALERT_CONFIG.flatMap((config) =>
    detectStatAlerts(
      config.getValue(before),
      config.getValue(after),
      config.thresholds,
      config.lowType,
      config.criticalType,
    ),
  );
}

export function detectPeriodicCriticalAlerts(
  status: PokemonStatusModel,
  lastShownAt: Readonly<Partial<Record<StatusAlertType, number>>>,
  now: number = Date.now(),
  repeatIntervalMs: number = TIMER_CONFIG.CRITICAL_ALERT_REPEAT_MS,
): StatusAlertType[] {
  const alerts: StatusAlertType[] = [];

  for (const config of STAT_ALERT_CONFIG) {
    const value = config.getValue(status);
    const level = getStatusIndicatorLevel(
      value,
      config.thresholds.warning,
      config.thresholds.critical,
    );

    if (level !== 'critical') {
      continue;
    }

    const lastShown = lastShownAt[config.criticalType];

    if (lastShown === undefined || now - lastShown >= repeatIntervalMs) {
      alerts.push(config.criticalType);
    }
  }

  return alerts;
}

export function getElapsedDecayMs(
  lastDecayTime: number | null,
  lastActionTime: number | null,
  now: number,
): number {
  const anchor = lastDecayTime ?? lastActionTime ?? now;

  return Math.max(0, now - anchor);
}
