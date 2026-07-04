import { TIMER_CONFIG } from '../constants/timer.constants';
import type { DailyRoutine } from '../models/tamagotchi-state.model';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface RoutineBonusResult {
  bonus: number;
  dailyRoutine: DailyRoutine;
}

export function toActivityDateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

export function totalRoutineActions(activityCounts: Record<string, number>): number {
  return activityCounts['total'] ?? 0;
}

export function recordRoutineActivity(
  routine: DailyRoutine,
  activityKey: string,
  now: number = Date.now(),
): DailyRoutine {
  const today = toActivityDateKey(now);

  if (routine.lastActivityDate === today) {
    const activityCounts = {
      ...routine.activityCounts,
      [activityKey]: (routine.activityCounts[activityKey] ?? 0) + 1,
      total: totalRoutineActions(routine.activityCounts) + 1,
    };

    return {
      ...routine,
      activityCounts,
      bonusEligible: isRoutineBonusEligible(routine.consecutiveDays, activityCounts['total']),
    };
  }

  let consecutiveDays = 0;

  if (routine.lastActivityDate === toActivityDateKey(now - MS_PER_DAY)) {
    const previousTotal = totalRoutineActions(routine.activityCounts);

    consecutiveDays =
      previousTotal >= TIMER_CONFIG.ROUTINE.MIN_DAILY_ACTIONS ? routine.consecutiveDays + 1 : 0;
  }

  const activityCounts = {
    [activityKey]: 1,
    total: 1,
  };

  return {
    activityCounts,
    bonusAppliedDate: null,
    bonusEligible: isRoutineBonusEligible(consecutiveDays, 1),
    consecutiveDays,
    lastActivityDate: today,
  };
}

export function isRoutineBonusEligible(consecutiveDays: number, totalToday: number): boolean {
  return (
    consecutiveDays >= TIMER_CONFIG.ROUTINE.CONSECUTIVE_DAYS_FOR_BONUS &&
    totalToday >= TIMER_CONFIG.ROUTINE.MIN_DAILY_ACTIONS
  );
}

export function applyRoutineBonusIfEligible(
  routine: DailyRoutine,
  now: number = Date.now(),
): RoutineBonusResult {
  const today = toActivityDateKey(now);

  if (!routine.bonusEligible || routine.bonusAppliedDate === today) {
    return { bonus: 0, dailyRoutine: routine };
  }

  return {
    bonus: TIMER_CONFIG.ROUTINE.BONUS_MOOD,
    dailyRoutine: {
      ...routine,
      bonusAppliedDate: today,
    },
  };
}
