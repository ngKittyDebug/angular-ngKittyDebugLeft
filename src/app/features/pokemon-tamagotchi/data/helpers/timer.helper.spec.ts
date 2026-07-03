import { describe, expect, it } from 'vitest';
import { TIMER_CONFIG } from '../constants/timer.constants';
import { createInitialDailyRoutine } from '../store/tamagotchi-initial';
import {
  isRoutineBonusEligible,
  recordRoutineActivity,
  routineBonusMood,
  toActivityDateKey,
} from './routine.helper';
import { calculateSleepRestorationBonus } from './sleep-restoration.helper';

describe('routine.helper', () => {
  it('tracks activity counts for the current day', () => {
    const now = Date.parse('2026-07-01T10:00:00.000Z');
    const updated = recordRoutineActivity(createInitialDailyRoutine(), 'feed', now);

    expect(updated.lastActivityDate).toBe(toActivityDateKey(now));
    expect(updated.activityCounts['feed']).toBe(1);
    expect(updated.activityCounts['total']).toBe(1);
  });

  it('marks routine bonus eligible after enough consecutive active days', () => {
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
    expect(routineBonusMood(routine)).toBe(TIMER_CONFIG.ROUTINE.BONUS_MOOD);
  });
});

describe('sleep-restoration.helper', () => {
  it('returns no bonus for short sleep', () => {
    const startedAt = Date.now() - 30 * 60 * 1000;

    expect(calculateSleepRestorationBonus(startedAt)).toBe(0);
  });

  it('returns bonus energy after sufficient sleep duration', () => {
    const startedAt = Date.now() - TIMER_CONFIG.SLEEP.MIN_DURATION_MS - 1000;

    expect(calculateSleepRestorationBonus(startedAt)).toBe(TIMER_CONFIG.SLEEP.BONUS_ENERGY);
  });
});
