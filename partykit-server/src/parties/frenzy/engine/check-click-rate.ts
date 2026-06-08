import { GAME } from '@game/frenzy/constants';

export interface RateCheckResult {
  allowed: boolean;
  timestamps: number[];
}

export function checkClickRate(timestamps: readonly number[], now: number): RateCheckResult {
  const recent = timestamps.filter((t) => now - t < GAME.clickRateLimitWindowMs);

  if (recent.length >= GAME.clickRateLimitMax) {
    return { allowed: false, timestamps: recent };
  }

  return { allowed: true, timestamps: [...recent, now] };
}
