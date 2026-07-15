import { TIMER_CONFIG } from '../constants/timer.constants';

export function calculateSleepRestorationBonus(
  lastSleepTime: number | null,
  now: number = Date.now(),
): number {
  if (lastSleepTime === null) {
    return 0;
  }

  const sleepDurationMs = now - lastSleepTime;

  if (sleepDurationMs < TIMER_CONFIG.SLEEP.MIN_DURATION_MS) {
    return 0;
  }

  return TIMER_CONFIG.SLEEP.BONUS_ENERGY;
}
