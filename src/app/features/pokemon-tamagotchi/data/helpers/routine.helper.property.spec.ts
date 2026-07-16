import { describe, expect, it } from 'vitest';
import { TIMER_CONFIG } from '../constants/timer.constants';
import { createInitialTamagotchiState } from '../store/tamagotchi-initial';
import { isRoutineBonusEligible, recordRoutineActivity } from './routine.helper';

describe('routine.helper', () => {
  describe('Happy Path', () => {
    describe('Property 19: право на бонус ежедневной рутины', () => {
      it('должен увеличивать последовательные дни только после достаточного числа действий в последовательные даты', () => {
        const dayOne = Date.parse('2026-07-01T12:00:00.000Z');
        const dayTwo = Date.parse('2026-07-02T12:00:00.000Z');
        let routine = recordRoutineActivity(
          createInitialTamagotchiState().dailyRoutine,
          'feed',
          dayOne,
        );

        for (let index = 0; index < TIMER_CONFIG.ROUTINE.MIN_DAILY_ACTIONS; index += 1) {
          routine = recordRoutineActivity(routine, 'feed', dayOne);
        }

        routine = recordRoutineActivity(routine, 'feed', dayTwo);

        expect(routine.consecutiveDays).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Edge Cases', () => {
    describe('Property 19: право на бонус ежедневной рутины', () => {
      it('должен начислять бонус рутины только на известных литеральных порогах', () => {
        const days = TIMER_CONFIG.ROUTINE.CONSECUTIVE_DAYS_FOR_BONUS;
        const actions = TIMER_CONFIG.ROUTINE.MIN_DAILY_ACTIONS;

        expect(isRoutineBonusEligible(days, actions)).toBe(true);
        expect(isRoutineBonusEligible(days - 1, actions)).toBe(false);
        expect(isRoutineBonusEligible(days, actions - 1)).toBe(false);
        expect(isRoutineBonusEligible(0, 0)).toBe(false);
        expect(isRoutineBonusEligible(days + 2, actions + 2)).toBe(true);
      });
    });
  });
});
