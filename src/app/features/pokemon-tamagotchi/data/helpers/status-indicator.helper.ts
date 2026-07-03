import type { StatusThresholdsModel } from '../models/pokemon-status.model';
import type { StatusType } from '../models/pokemon-status.model';

export type StatusIndicatorLevel = 'critical' | 'normal' | 'warning';

export function getStatusIndicatorLevel(
  value: number,
  warning: number,
  critical: number,
): StatusIndicatorLevel {
  if (value <= critical) {
    return 'critical';
  }

  if (value <= warning) {
    return 'warning';
  }

  return 'normal';
}

export function getStatusIndicatorColor(level: StatusIndicatorLevel): string {
  switch (level) {
    case 'critical':
      return 'var(--tui-status-negative)';

    case 'warning':
      return 'var(--tui-status-warning)';

    case 'normal':
      return 'var(--tui-status-positive)';
  }
}

export function getThresholdsForStatusType(
  statusType: StatusType,
  thresholds: StatusThresholdsModel,
): { critical: number; warning: number } | null {
  switch (statusType) {
    case 'health':
      return { critical: thresholds.healthCritical, warning: thresholds.healthWarning };

    case 'hunger':
      return { critical: thresholds.hungerCritical, warning: thresholds.hungerWarning };

    case 'mood':
      return { critical: thresholds.moodCritical, warning: thresholds.moodWarning };

    case 'energy':
      return { critical: thresholds.energyCritical, warning: thresholds.energyWarning };

    case 'hydration':
      return { critical: thresholds.hydrationCritical, warning: thresholds.hydrationWarning };

    case 'experience':
      return null;
  }
}

export function resolveStatusIndicatorColor(
  statusType: StatusType,
  value: number,
  thresholds: StatusThresholdsModel,
): string {
  const bounds = getThresholdsForStatusType(statusType, thresholds);

  if (!bounds) {
    return 'var(--tui-background-accent-1)';
  }

  return getStatusIndicatorColor(getStatusIndicatorLevel(value, bounds.warning, bounds.critical));
}
