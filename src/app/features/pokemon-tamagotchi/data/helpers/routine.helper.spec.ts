import { describe, expect, it } from 'vitest';
import { TIMER_CONFIG } from '../constants/timer.constants';
import { createInitialDailyRoutine } from '../store/tamagotchi-initial';
import {
  applyRoutineBonusIfEligible,
  isRoutineBonusEligible,
  recordRoutineActivity,
  toActivityDateKey,
} from './routine.helper';

describe('routine.helper', () => {
  describe('Happy Path', () => {
    it('должен учитывать количество активностей за текущий день', () => {
      const now = Date.parse('2026-07-01T10:00:00.000Z');
      const updated = recordRoutineActivity(createInitialDailyRoutine(), 'feed', now);

      expect(updated.lastActivityDate).toBe(toActivityDateKey(now));
      expect(updated.activityCounts['feed']).toBe(1);
      expect(updated.activityCounts['total']).toBe(1);
    });

    it('должен делать routine bonus доступным после достаточного числа активных дней подряд', () => {
      const dayOne = Date.parse('2026-07-01T10:00:00.000Z');
      let routine = createInitialDailyRoutine();

      for (let index = 0; index < TIMER_CONFIG.ROUTINE.MIN_DAILY_ACTIONS; index += 1) {
        routine = recordRoutineActivity(routine, 'feed', dayOne + index * 1000);
      }

      const dayTwo = dayOne + 24 * 60 * 60 * 1000;

      for (let index = 0; index < TIMER_CONFIG.ROUTINE.MIN_DAILY_ACTIONS; index += 1) {
        routine = recordRoutineActivity(routine, 'play', dayTwo + index * 1000);
      }

      const dayThree = dayTwo + 24 * 60 * 60 * 1000;

      for (let index = 0; index < TIMER_CONFIG.ROUTINE.MIN_DAILY_ACTIONS; index += 1) {
        routine = recordRoutineActivity(routine, 'care', dayThree + index * 1000);
      }

      const dayFour = dayThree + 24 * 60 * 60 * 1000;

      for (let index = 0; index < TIMER_CONFIG.ROUTINE.MIN_DAILY_ACTIONS; index += 1) {
        routine = recordRoutineActivity(routine, 'water', dayFour + index * 1000);
      }

      expect(routine.consecutiveDays).toBeGreaterThanOrEqual(
        TIMER_CONFIG.ROUTINE.CONSECUTIVE_DAYS_FOR_BONUS,
      );
      expect(
        isRoutineBonusEligible(routine.consecutiveDays, routine.activityCounts['total'] ?? 0),
      ).toBe(true);

      const dayFourBonus = applyRoutineBonusIfEligible(routine, dayFour);

      expect(dayFourBonus.bonus).toBe(TIMER_CONFIG.ROUTINE.BONUS_MOOD);
      expect(dayFourBonus.dailyRoutine.bonusAppliedDate).toBe(toActivityDateKey(dayFour));

      const secondBonusSameDay = applyRoutineBonusIfEligible(dayFourBonus.dailyRoutine, dayFour);

      expect(secondBonusSameDay.bonus).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('должен требовать и подряд идущие дни, и достаточное число действий за день', () => {
      expect(isRoutineBonusEligible(3, 3)).toBe(true);
      expect(isRoutineBonusEligible(2, 5)).toBe(false);
      expect(isRoutineBonusEligible(4, 2)).toBe(false);
    });
  });
});
