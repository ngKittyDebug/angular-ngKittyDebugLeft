import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { TIMER_CONFIG } from '../constants/timer.constants';
import { calculateSleepRestorationBonus } from './sleep-restoration.helper';

const PROPERTY_RUNS = 100;
const STARTED_AT = 1_000_000;

describe('sleep-restoration.helper', () => {
  describe('Happy Path', () => {
    describe('Property 10: восстановление энергии в режиме сна', () => {
      it('должен начислять бонус ровно на пороге минимальной длительности сна', () => {
        expect(
          calculateSleepRestorationBonus(
            STARTED_AT,
            STARTED_AT + TIMER_CONFIG.SLEEP.MIN_DURATION_MS,
          ),
        ).toBe(TIMER_CONFIG.SLEEP.BONUS_ENERGY);
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Property 10: восстановление энергии в режиме сна', () => {
      it('должен давать нулевой бонус на известных коротких длительностях', () => {
        expect(calculateSleepRestorationBonus(STARTED_AT, STARTED_AT)).toBe(0);
        expect(
          calculateSleepRestorationBonus(
            STARTED_AT,
            STARTED_AT + TIMER_CONFIG.SLEEP.MIN_DURATION_MS - 1,
          ),
        ).toBe(0);
      });

      it('должен возвращать только 0 или BONUS_ENERGY для произвольной длительности', () => {
        fc.assert(
          fc.property(fc.nat({ max: TIMER_CONFIG.SLEEP.MIN_DURATION_MS * 2 }), (elapsedMs) => {
            const bonus = calculateSleepRestorationBonus(STARTED_AT, STARTED_AT + elapsedMs);

            return bonus === 0 || bonus === TIMER_CONFIG.SLEEP.BONUS_ENERGY;
          }),
          { numRuns: PROPERTY_RUNS },
        );
      });
    });
  });
});
