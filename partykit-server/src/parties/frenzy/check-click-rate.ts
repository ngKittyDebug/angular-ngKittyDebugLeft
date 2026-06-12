import { FRENZY } from '@game/frenzy/config';

export interface RateCheckResult {
  allowed: boolean;
  timestamps: number[];
}

export function checkClickRate(timestamps: readonly number[], now: number): RateCheckResult {
  const recent = timestamps.filter((t) => now - t < FRENZY.clickRateLimitWindowMs);

  if (recent.length >= FRENZY.clickRateLimitMax) {
    return { allowed: false, timestamps: recent };
  }

  return { allowed: true, timestamps: [...recent, now] };
}
