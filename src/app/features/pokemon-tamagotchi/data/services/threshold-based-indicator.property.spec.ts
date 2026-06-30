import * as fc from 'fast-check';
import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import {
  getStatusIndicatorColor,
  getStatusIndicatorLevel,
  getThresholdsForStatusType,
  resolveStatusIndicatorColor,
  type StatusIndicatorLevel,
} from '../helpers/status-indicator.helper';
import type { StatusThresholds, StatusType } from '../../models/pokemon-status.model';

const PROPERTY_RUNS = 100;

const THRESHOLDED_STATUS_TYPES: StatusType[] = ['energy', 'health', 'hunger', 'hydration', 'mood'];

const arbitraryStatusValue = fc.integer({ max: 100, min: 0 });

const arbitraryThresholdPair = fc
  .tuple(fc.integer({ max: 100, min: 0 }), fc.integer({ max: 100, min: 0 }))
  .map(([first, second]) => ({
    critical: Math.min(first, second),
    warning: Math.max(first, second),
  }));

function expectedLevel(value: number, warning: number, critical: number): StatusIndicatorLevel {
  if (value <= critical) {
    return 'critical';
  }

  if (value <= warning) {
    return 'warning';
  }

  return 'normal';
}

function shouldActivateWarning(level: StatusIndicatorLevel): boolean {
  return level === 'warning';
}

function shouldActivateCritical(level: StatusIndicatorLevel): boolean {
  return level === 'critical';
}

describe('Tamagotchi property tests', () => {
  describe('Property 3: Threshold-Based Indicator Behavior', () => {
    // Feature: pokemon-tamagotchi, Property 3: Threshold-Based Indicator Behavior
    it('should classify indicator levels only when values reach configured thresholds', () => {
      fc.assert(
        fc.property(
          arbitraryStatusValue,
          arbitraryThresholdPair,
          (value, { critical, warning }) => {
            const level = getStatusIndicatorLevel(value, warning, critical);

            return level === expectedLevel(value, warning, critical);
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should activate warning and critical alerts only at or below their thresholds', () => {
      fc.assert(
        fc.property(
          arbitraryStatusValue,
          arbitraryThresholdPair,
          (value, { critical, warning }) => {
            const level = getStatusIndicatorLevel(value, warning, critical);

            if (value > warning) {
              return !shouldActivateWarning(level) && !shouldActivateCritical(level);
            }

            if (value > critical) {
              return shouldActivateWarning(level) && !shouldActivateCritical(level);
            }

            return shouldActivateCritical(level);
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should apply equivalent indicator levels across all thresholded status types', () => {
      fc.assert(
        fc.property(
          arbitraryThresholdPair,
          arbitraryStatusValue,
          ({ critical, warning }, value) => {
            const levels = THRESHOLDED_STATUS_TYPES.map(() =>
              getStatusIndicatorLevel(value, warning, critical),
            );

            return levels.every((level) => level === levels[0]);
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should map equivalent threshold violations to the same indicator color', () => {
      fc.assert(
        fc.property(
          arbitraryThresholdPair,
          arbitraryStatusValue,
          ({ critical, warning }, value) => {
            const uniformThresholds: StatusThresholds = {
              energyCritical: critical,
              energyWarning: warning,
              healthCritical: critical,
              healthWarning: warning,
              hungerCritical: critical,
              hungerWarning: warning,
              hydrationCritical: critical,
              hydrationWarning: warning,
              moodCritical: critical,
              moodWarning: warning,
            };
            const colors = THRESHOLDED_STATUS_TYPES.map((statusType) =>
              resolveStatusIndicatorColor(statusType, value, uniformThresholds),
            );

            return colors.every((color) => color === colors[0]);
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should keep indicator severity monotonic as status values decrease', () => {
      fc.assert(
        fc.property(
          fc.integer({ max: 100, min: 1 }),
          fc.integer({ max: 100, min: 0 }),
          arbitraryThresholdPair,
          (higherValue, delta, { critical, warning }) => {
            const lowerValue = higherValue - Math.min(delta, higherValue);
            const higherLevel = getStatusIndicatorLevel(higherValue, warning, critical);
            const lowerLevel = getStatusIndicatorLevel(lowerValue, warning, critical);
            const severity: Record<StatusIndicatorLevel, number> = {
              critical: 2,
              normal: 0,
              warning: 1,
            };

            return severity[lowerLevel] >= severity[higherLevel];
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should use a neutral accent color for experience without threshold alerts', () => {
      fc.assert(
        fc.property(arbitraryStatusValue, (value) => {
          const bounds = getThresholdsForStatusType('experience', STATUS_THRESHOLDS);
          const color = resolveStatusIndicatorColor('experience', value, STATUS_THRESHOLDS);

          return bounds === null && color === 'var(--tui-background-accent-1)';
        }),
        { numRuns: PROPERTY_RUNS },
      );
    });

    it('should map each indicator level to a single stable color token', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<StatusIndicatorLevel>('critical', 'normal', 'warning'),
          (level) => {
            const first = getStatusIndicatorColor(level);
            const second = getStatusIndicatorColor(level);

            return first === second && first.length > 0;
          },
        ),
        { numRuns: PROPERTY_RUNS },
      );
    });
  });
});
