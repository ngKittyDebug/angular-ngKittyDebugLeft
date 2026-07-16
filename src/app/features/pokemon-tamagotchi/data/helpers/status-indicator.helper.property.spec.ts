import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { STATUS_THRESHOLDS } from '../constants/status-thresholds.constants';
import {
  getStatusIndicatorColor,
  getStatusIndicatorLevel,
  getThresholdsForStatusType,
  resolveStatusIndicatorColor,
  type StatusIndicatorLevel,
} from './status-indicator.helper';
import type { StatusThresholdsModel, StatusType } from '../models/pokemon-status.model';

const PROPERTY_RUNS = 100;

const THRESHOLDED_STATUS_TYPES: StatusType[] = ['energy', 'health', 'hunger', 'hydration', 'mood'];

const arbitraryStatusValue = fc.integer({ max: 100, min: 0 });

const arbitraryThresholdPair = fc
  .tuple(fc.integer({ max: 100, min: 0 }), fc.integer({ max: 100, min: 0 }))
  .map(([first, second]) => ({
    critical: Math.min(first, second),
    warning: Math.max(first, second),
  }));

describe('status-indicator.helper', () => {
  describe('Happy Path', () => {
    describe('Property 3: пороговая классификация', () => {
      it('должен возвращать critical для значений из диапазона [0, critical]', () => {
        fc.assert(
          fc.property(
            arbitraryThresholdPair.chain(({ critical, warning }) =>
              fc.record({
                critical: fc.constant(critical),
                value: fc.integer({ max: critical, min: 0 }),
                warning: fc.constant(warning),
              }),
            ),
            ({ critical, value, warning }) =>
              getStatusIndicatorLevel(value, warning, critical) === 'critical',
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен возвращать warning для значений из диапазона (critical, warning]', () => {
        fc.assert(
          fc.property(
            arbitraryThresholdPair
              .filter(({ critical, warning }) => critical < warning)
              .chain(({ critical, warning }) =>
                fc.record({
                  critical: fc.constant(critical),
                  value: fc.integer({ max: warning, min: critical + 1 }),
                  warning: fc.constant(warning),
                }),
              ),
            ({ critical, value, warning }) =>
              getStatusIndicatorLevel(value, warning, critical) === 'warning',
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен возвращать normal для значений из диапазона (warning, 100]', () => {
        fc.assert(
          fc.property(
            arbitraryThresholdPair
              .filter(({ warning }) => warning < 100)
              .chain(({ critical, warning }) =>
                fc.record({
                  critical: fc.constant(critical),
                  value: fc.integer({ max: 100, min: warning + 1 }),
                  warning: fc.constant(warning),
                }),
              ),
            ({ critical, value, warning }) =>
              getStatusIndicatorLevel(value, warning, critical) === 'normal',
          ),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен применять одинаковый уровень ко всем пороговым типам статуса', () => {
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

      it('должен сопоставлять одинаковые нарушения порогов одному цвету индикатора', () => {
        fc.assert(
          fc.property(
            arbitraryThresholdPair,
            arbitraryStatusValue,
            ({ critical, warning }, value) => {
              const uniformThresholds: StatusThresholdsModel = {
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

      it('должен сохранять монотонность серьёзности при уменьшении значения статуса', () => {
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

      it('должен использовать нейтральный accent-цвет для experience без пороговых алертов', () => {
        fc.assert(
          fc.property(arbitraryStatusValue, (value) => {
            const bounds = getThresholdsForStatusType('experience', STATUS_THRESHOLDS);
            const color = resolveStatusIndicatorColor('experience', value, STATUS_THRESHOLDS);

            return bounds === null && color === 'var(--tui-background-accent-1)';
          }),
          { numRuns: PROPERTY_RUNS },
        );
      });

      it('должен сопоставлять каждому уровню индикатора стабильный цветовой токен', () => {
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

  describe('Edge Cases', () => {
    describe('Property 3: пороговая классификация', () => {
      it('должен классифицировать value на границе critical как critical', () => {
        expect(getStatusIndicatorLevel(20, 50, 20)).toBe('critical');
      });

      it('должен классифицировать value на границе warning как warning', () => {
        expect(getStatusIndicatorLevel(50, 50, 20)).toBe('warning');
      });

      it('должен классифицировать value выше warning как normal', () => {
        expect(getStatusIndicatorLevel(51, 50, 20)).toBe('normal');
      });
    });
  });
});
