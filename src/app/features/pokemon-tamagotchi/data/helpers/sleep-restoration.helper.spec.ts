import { describe, expect, it } from 'vitest';
import { TIMER_CONFIG } from '../constants/timer.constants';
import { calculateSleepRestorationBonus } from './sleep-restoration.helper';

describe('sleep-restoration.helper', () => {
  describe('Edge Cases', () => {
    it('должен не начислять бонус за короткий сон', () => {
      const startedAt = Date.now() - 30 * 60 * 1000;

      expect(calculateSleepRestorationBonus(startedAt)).toBe(0);
    });

    it('должен начислять бонус энергии после достаточной длительности сна', () => {
      const startedAt = Date.now() - TIMER_CONFIG.SLEEP.MIN_DURATION_MS - 1000;

      expect(calculateSleepRestorationBonus(startedAt)).toBe(TIMER_CONFIG.SLEEP.BONUS_ENERGY);
    });
  });
});
